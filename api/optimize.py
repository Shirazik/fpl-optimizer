#!/usr/bin/env python3
"""
Vercel Serverless Function for FPL Transfer Optimization

This is a consolidated handler that includes both the HTTP handler and the
MILP optimization logic in a single file to avoid import issues in Vercel's
isolated serverless environment.

The optimizer uses Mixed Integer Linear Programming (MILP) via PuLP + HiGHS
to find optimal transfers for Fantasy Premier League teams.
"""

import json
from http.server import BaseHTTPRequestHandler
from typing import Any

import pulp


# =============================================================================
# MILP Optimizer Configuration
# =============================================================================

# Horizon weights - discount future gameweeks due to uncertainty
HORIZON_WEIGHTS = [1.0, 0.85, 0.7, 0.55, 0.4, 0.3, 0.2, 0.15]

# Position constraints
POSITION_LIMITS = {
    1: 2,   # GK
    2: 5,   # DEF
    3: 5,   # MID
    4: 3,   # FWD
}

# Maximum players from any single team
MAX_PER_TEAM = 3

# Point hit per extra transfer
POINT_HIT_PENALTY = 4


# =============================================================================
# MILP Optimizer Functions
# =============================================================================

def prefilter_players(
    all_players: list[dict[str, Any]],
    current_squad_set: set[int],
    budget: float,
    horizon: int,
) -> list[dict[str, Any]]:
    """
    Pre-filter players to reduce problem size.

    Keeps all current squad players plus the most viable alternatives.
    Filters out players who are unlikely to be optimal based on:
    - Price (too expensive for budget)
    - Expected points (very low performers)
    """
    # Always keep current squad players
    filtered = [p for p in all_players if p["id"] in current_squad_set]

    # For non-squad players, apply heuristics
    non_squad = [p for p in all_players if p["id"] not in current_squad_set]

    # Filter 1: Remove players more expensive than budget
    affordable = [p for p in non_squad if p["price"] <= budget]

    # Filter 2: Calculate basic expected points and remove bottom performers
    by_position = {1: [], 2: [], 3: [], 4: []}
    for p in affordable:
        total_ep = sum(p.get(f"ep_gw{gw}", 0) or 0 for gw in range(1, min(horizon + 1, 9)))
        by_position[p["position"]].append((p, total_ep))

    # Keep top 50% of each position by expected points
    for pos in by_position:
        by_position[pos].sort(key=lambda x: x[1], reverse=True)
        keep_count = max(30, len(by_position[pos]) // 2)
        filtered.extend([p for p, _ in by_position[pos][:keep_count]])

    return filtered


def optimize_transfers(
    current_squad: list[int],
    all_players: list[dict[str, Any]],
    budget: float,
    free_transfers: int,
    horizon: int = 3,
    max_transfers: int = 2,
    bank: float = None,
) -> dict[str, Any]:
    """
    Find optimal transfers using MILP optimization.

    Args:
        current_squad: List of player IDs currently owned
        all_players: List of player dicts with id, position, team, price, ep_gw1, etc.
        budget: Total available budget (current squad value + bank)
        free_transfers: Number of free transfers available (0, 1, or 2)
        horizon: Number of gameweeks to consider for expected points
        max_transfers: Maximum number of transfers to allow
        bank: Available cash for budget constraint

    Returns:
        Dictionary with optimal squad, transfers, and expected points
    """

    # Create player lookup
    players_by_id = {p["id"]: p for p in all_players}
    current_squad_set = set(current_squad)

    # Pre-filter players to reduce problem size
    filtered_players = prefilter_players(all_players, current_squad_set, budget, horizon)

    # Create the optimization problem
    prob = pulp.LpProblem("FPL_Transfer_Optimization", pulp.LpMaximize)

    # Decision variables
    x = {
        p["id"]: pulp.LpVariable(f"x_{p['id']}", cat="Binary")
        for p in filtered_players
    }

    # t_in[i] = 1 if player i is transferred in (only for non-owned)
    t_in = {
        p["id"]: pulp.LpVariable(f"t_in_{p['id']}", cat="Binary")
        for p in filtered_players
        if p["id"] not in current_squad_set
    }

    # t_out[i] = 1 if player i is transferred out (only for owned)
    t_out = {
        pid: pulp.LpVariable(f"t_out_{pid}", cat="Binary")
        for pid in current_squad
        if pid in {p["id"] for p in filtered_players}
    }

    # Calculate weighted expected points for each player
    def get_expected_points(player: dict) -> float:
        total = 0.0
        for gw in range(1, min(horizon + 1, len(HORIZON_WEIGHTS) + 1)):
            ep_key = f"ep_gw{gw}"
            ep = player.get(ep_key, 0) or 0
            weight = HORIZON_WEIGHTS[gw - 1] if gw <= len(HORIZON_WEIGHTS) else 0.1
            total += ep * weight
        return total

    player_ep = {p["id"]: get_expected_points(p) for p in filtered_players}

    # Auxiliary variables
    num_transfers = pulp.LpVariable("num_transfers", lowBound=0, cat="Integer")
    hits = pulp.LpVariable("hits", lowBound=0, cat="Integer")

    # Objective: Maximize expected points minus point hit penalty
    prob += (
        pulp.lpSum(x[p["id"]] * player_ep[p["id"]] for p in filtered_players)
        - POINT_HIT_PENALTY * hits,
        "Maximize_Expected_Points"
    )

    # Constraints

    # 1. Squad size must be exactly 15
    prob += (
        pulp.lpSum(x[p["id"]] for p in filtered_players) == 15,
        "Squad_Size"
    )

    # 2. Position constraints
    for pos, limit in POSITION_LIMITS.items():
        prob += (
            pulp.lpSum(x[p["id"]] for p in filtered_players if p["position"] == pos) == limit,
            f"Position_{pos}_Limit"
        )

    # 3. Budget constraint
    available_bank = bank if bank is not None else budget

    transfer_in_cost = pulp.lpSum(
        p["price"] * t_in[p["id"]]
        for p in filtered_players
        if p["id"] not in current_squad_set
    )

    transfer_out_revenue = pulp.lpSum(
        p.get("selling_price", p["price"]) * t_out[p["id"]]
        for p in filtered_players
        if p["id"] in current_squad_set
    )

    prob += (
        transfer_in_cost - transfer_out_revenue <= available_bank,
        "Budget_Constraint"
    )

    # 4. Maximum 3 players per team
    teams = set(p["team"] for p in filtered_players)
    for team in teams:
        prob += (
            pulp.lpSum(x[p["id"]] for p in filtered_players if p["team"] == team) <= MAX_PER_TEAM,
            f"Team_{team}_Limit"
        )

    # 5. Transfer logic constraints
    for player in filtered_players:
        pid = player["id"]

        if pid in current_squad_set:
            prob += t_out[pid] >= 1 - x[pid], f"Transfer_Out_Logic_1_{pid}"
            prob += t_out[pid] <= 1 - x[pid], f"Transfer_Out_Logic_2_{pid}"
        else:
            prob += t_in[pid] >= x[pid], f"Transfer_In_Logic_1_{pid}"
            prob += t_in[pid] <= x[pid], f"Transfer_In_Logic_2_{pid}"

    # 6. Transfer balance (ins = outs)
    prob += (
        pulp.lpSum(t_in.values()) == pulp.lpSum(t_out.values()),
        "Transfer_Balance"
    )

    # 7. Define num_transfers
    prob += (
        num_transfers == pulp.lpSum(t_in.values()),
        "Num_Transfers_Definition"
    )

    # 8. Limit maximum transfers
    prob += num_transfers <= max_transfers, "Max_Transfers"

    # 9. Point hits
    prob += hits >= num_transfers - free_transfers, "Hits_Lower_Bound"

    # Solve
    try:
        import highspy
        solver = pulp.HiGHS(msg=0, timeLimit=30)
    except (ImportError, Exception):
        solver = pulp.getSolver("PULP_CBC_CMD", msg=0, timeLimit=30)

    prob.solve(solver)

    # Check if solution is optimal
    if prob.status != pulp.LpStatusOptimal:
        current_value = sum(players_by_id[pid]["price"] for pid in current_squad if pid in players_by_id)
        pos_counts = {1: 0, 2: 0, 3: 0, 4: 0}
        for pid in current_squad:
            if pid in players_by_id:
                pos_counts[players_by_id[pid]["position"]] += 1

        return {
            "error": f"Optimization failed: {pulp.LpStatus[prob.status]}",
            "squad": current_squad,
            "transfers_in": [],
            "transfers_out": [],
            "total_transfers": 0,
            "point_hit": 0,
            "expected_points": 0,
        }

    # Extract solution
    final_squad = [p["id"] for p in filtered_players if pulp.value(x[p["id"]]) > 0.5]
    transfers_in_ids = [pid for pid in t_in if pulp.value(t_in[pid]) > 0.5]
    transfers_out_ids = [pid for pid in t_out if pulp.value(t_out[pid]) > 0.5]

    total_transfers = int(pulp.value(num_transfers))
    point_hit = int(pulp.value(hits)) * POINT_HIT_PENALTY
    expected_points = sum(player_ep[pid] for pid in final_squad) - point_hit

    transfers_in = [players_by_id[pid] for pid in transfers_in_ids]
    transfers_out = [players_by_id[pid] for pid in transfers_out_ids]

    return {
        "squad": final_squad,
        "transfers_in": transfers_in,
        "transfers_out": transfers_out,
        "total_transfers": total_transfers,
        "point_hit": point_hit,
        "expected_points": round(expected_points, 2),
    }


# =============================================================================
# Vercel Serverless Handler
# =============================================================================

class handler(BaseHTTPRequestHandler):
    """
    Vercel serverless function handler.
    Expects POST request with JSON body containing optimization parameters.
    """

    def do_POST(self):
        """Handle POST requests"""
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            data = json.loads(body.decode('utf-8'))

            result = optimize_transfers(
                current_squad=data['current_squad'],
                all_players=data['all_players'],
                budget=data['budget'],
                bank=data.get('bank', None),
                free_transfers=data.get('free_transfers', 1),
                horizon=data.get('horizon', 3),
                max_transfers=data.get('max_transfers', 2),
            )

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(result).encode('utf-8'))

        except KeyError as e:
            self.send_response(400)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'error': f'Missing required field: {str(e)}'}).encode('utf-8'))

        except json.JSONDecodeError as e:
            self.send_response(400)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'error': f'Invalid JSON: {str(e)}'}).encode('utf-8'))

        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'error': f'Optimization failed: {str(e)}'}).encode('utf-8'))

    def do_GET(self):
        """Handle GET requests - return info about the endpoint"""
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        info = {
            'name': 'FPL Transfer Optimizer',
            'method': 'POST',
            'description': 'MILP-based transfer optimization for Fantasy Premier League',
            'version': '1.0.0'
        }
        self.wfile.write(json.dumps(info).encode('utf-8'))
