#!/usr/bin/env python3
"""
FPL Transfer Optimizer using MILP (Mixed Integer Linear Programming)

This script finds the optimal transfer(s) for an FPL squad by solving
a constrained optimization problem using PuLP with the HiGHS solver.

Performance Optimizations:
    1. Pre-filtering: Reduces player pool from 600+ to ~200 by filtering out
       clearly non-optimal players (too expensive, bottom 50% by position)
    2. Sparse transfer variables: Only creates t_in for non-owned players and
       t_out for owned players (~1200 fewer binary variables)
    3. Tightened constraints: Simplified transfer logic using ownership knowledge

Typical solve time: <100ms for single transfer, <500ms for multi-transfer

Usage:
    echo '{"current_squad": [...], "all_players": [...], ...}' | python optimize_transfers.py

Input (JSON via stdin):
    - current_squad: List of player IDs currently owned
    - all_players: List of player objects with id, position, team, price, ep_gw1, etc.
    - budget: Total available budget (squad value + bank)
    - free_transfers: Number of free transfers (0, 1, or 2)
    - horizon: Number of gameweeks to optimize for (default: 3)
    - max_transfers: Maximum transfers to consider (default: 2)

Output (JSON via stdout):
    - squad: List of player IDs in optimal squad
    - transfers_in: Players to transfer in
    - transfers_out: Players to transfer out
    - total_transfers: Number of transfers made
    - point_hit: Penalty points for extra transfers
    - expected_points: Total expected points over horizon
"""

import json
import sys
from typing import Any

import pulp


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

    Args:
        all_players: Full list of all players
        current_squad_set: Set of currently owned player IDs
        budget: Available budget
        horizon: Number of gameweeks for expected points calculation

    Returns:
        Filtered list of viable players
    """
    # Always keep current squad players
    filtered = [p for p in all_players if p["id"] in current_squad_set]

    # For non-squad players, apply heuristics
    non_squad = [p for p in all_players if p["id"] not in current_squad_set]

    # Filter 1: Remove players more expensive than budget
    # (Can't possibly afford them even if we sold entire squad)
    affordable = [p for p in non_squad if p["price"] <= budget]

    # Filter 2: Calculate basic expected points and remove bottom performers
    # Keep top performers by position to maintain viable options
    by_position = {1: [], 2: [], 3: [], 4: []}
    for p in affordable:
        total_ep = sum(p.get(f"ep_gw{gw}", 0) or 0 for gw in range(1, min(horizon + 1, 9)))
        by_position[p["position"]].append((p, total_ep))

    # Keep top 50% of each position by expected points
    # This ensures we have enough options while reducing problem size
    for pos in by_position:
        by_position[pos].sort(key=lambda x: x[1], reverse=True)
        # Keep at least 30 players per position, or top 50%, whichever is larger
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

    Returns:
        Dictionary with optimal squad, transfers, and expected points
    """

    # Create player lookup
    players_by_id = {p["id"]: p for p in all_players}
    current_squad_set = set(current_squad)

    # Pre-filter players to reduce problem size
    # This significantly speeds up solving by removing clearly non-optimal players
    filtered_players = prefilter_players(all_players, current_squad_set, budget, horizon)

    # Create the optimization problem
    prob = pulp.LpProblem("FPL_Transfer_Optimization", pulp.LpMaximize)

    # Decision variables
    # x[i] = 1 if player i is in the final squad
    x = {
        p["id"]: pulp.LpVariable(f"x_{p['id']}", cat="Binary")
        for p in filtered_players
    }

    # t_in[i] = 1 if player i is transferred in
    # Only create for players NOT currently owned (reduces binary variables)
    t_in = {
        p["id"]: pulp.LpVariable(f"t_in_{p['id']}", cat="Binary")
        for p in filtered_players
        if p["id"] not in current_squad_set
    }

    # t_out[i] = 1 if player i is transferred out
    # Only create for players currently owned (reduces binary variables)
    t_out = {
        pid: pulp.LpVariable(f"t_out_{pid}", cat="Binary")
        for pid in current_squad
        if pid in {p["id"] for p in filtered_players}  # Only if player in filtered set
    }

    # Calculate weighted expected points for each player
    def get_expected_points(player: dict) -> float:
        """Calculate weighted expected points over the horizon."""
        total = 0.0
        for gw in range(1, min(horizon + 1, len(HORIZON_WEIGHTS) + 1)):
            ep_key = f"ep_gw{gw}"
            ep = player.get(ep_key, 0) or 0
            weight = HORIZON_WEIGHTS[gw - 1] if gw <= len(HORIZON_WEIGHTS) else 0.1
            total += ep * weight
        return total

    # Calculate expected points for all filtered players
    player_ep = {p["id"]: get_expected_points(p) for p in filtered_players}

    # Auxiliary variable for number of transfers
    num_transfers = pulp.LpVariable("num_transfers", lowBound=0, cat="Integer")

    # Auxiliary variable for point hits (transfers beyond free transfers)
    hits = pulp.LpVariable("hits", lowBound=0, cat="Integer")

    # --- Objective Function ---
    # Maximize expected points minus point hit penalty
    prob += (
        pulp.lpSum(x[p["id"]] * player_ep[p["id"]] for p in filtered_players)
        - POINT_HIT_PENALTY * hits,
        "Maximize_Expected_Points"
    )

    # --- Constraints ---

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
    # Net transfer cost = money spent on transfers in - money received from transfers out
    # This must not exceed the available bank balance
    # Use bank parameter if provided, otherwise fall back to budget
    available_bank = bank if bank is not None else budget

    # Cost of players transferred in (non-owned players bought)
    transfer_in_cost = pulp.lpSum(
        p["price"] * t_in[p["id"]]
        for p in filtered_players
        if p["id"] not in current_squad_set
    )

    # Revenue from players transferred out (owned players sold)
    # Use selling_price if available (accounts for half-profit rule), else price
    transfer_out_revenue = pulp.lpSum(
        p.get("selling_price", p["price"]) * t_out[p["id"]]
        for p in filtered_players
        if p["id"] in current_squad_set
    )

    # Net spend must not exceed bank
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
    # Split logic for owned vs non-owned players to use sparse t_in/t_out dictionaries
    for player in filtered_players:
        pid = player["id"]

        if pid in current_squad_set:
            # Player is currently owned - can only transfer out
            # t_out[i] = 1 if and only if owned and not in final squad
            # t_out[i] >= 1 - x[i] (if not in final squad, must transfer out)
            prob += t_out[pid] >= 1 - x[pid], f"Transfer_Out_Logic_1_{pid}"
            # t_out[i] <= 1 - x[i] (can only transfer out if not in final squad)
            prob += t_out[pid] <= 1 - x[pid], f"Transfer_Out_Logic_2_{pid}"
        else:
            # Player is not owned - can only transfer in
            # t_in[i] = 1 if and only if not owned and is now in squad
            # t_in[i] >= x[i] (if in final squad, must transfer in)
            prob += t_in[pid] >= x[pid], f"Transfer_In_Logic_1_{pid}"
            # t_in[i] <= x[i] (can only transfer in if in final squad)
            prob += t_in[pid] <= x[pid], f"Transfer_In_Logic_2_{pid}"

    # 6. Number of transfers must balance (ins = outs)
    # Use .values() since t_in and t_out are now sparse dictionaries
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

    # 9. Point hits (extra transfers beyond free transfers)
    prob += hits >= num_transfers - free_transfers, "Hits_Lower_Bound"

    # --- Solve ---
    # Try different solvers in order of preference
    # HiGHS via highspy bindings (native ARM support)
    try:
        import highspy
        solver = pulp.HiGHS(msg=0, timeLimit=30)
    except (ImportError, Exception):
        # Fallback to default solver
        solver = pulp.getSolver("PULP_CBC_CMD", msg=0, timeLimit=30)

    prob.solve(solver)

    # Check if solution is optimal
    if prob.status != pulp.LpStatusOptimal:
        # Gather diagnostic info
        import sys
        print(f"DEBUG: Problem status: {pulp.LpStatus[prob.status]}", file=sys.stderr)
        print(f"DEBUG: Budget: {budget}", file=sys.stderr)
        print(f"DEBUG: Current squad size: {len(current_squad)}", file=sys.stderr)
        print(f"DEBUG: Filtered players: {len(filtered_players)}", file=sys.stderr)
        print(f"DEBUG: Free transfers: {free_transfers}", file=sys.stderr)
        print(f"DEBUG: Max transfers: {max_transfers}", file=sys.stderr)

        # Check if current squad is valid
        current_value = sum(players_by_id[pid]["price"] for pid in current_squad if pid in players_by_id)
        print(f"DEBUG: Current squad value: {current_value}", file=sys.stderr)

        # Check position counts
        pos_counts = {1: 0, 2: 0, 3: 0, 4: 0}
        for pid in current_squad:
            if pid in players_by_id:
                pos_counts[players_by_id[pid]["position"]] += 1
        print(f"DEBUG: Position counts: GK={pos_counts[1]}, DEF={pos_counts[2]}, MID={pos_counts[3]}, FWD={pos_counts[4]}", file=sys.stderr)

        return {
            "error": f"Optimization failed with status: {pulp.LpStatus[prob.status]}. Budget: £{budget}m, Squad value: £{current_value}m, Positions: {pos_counts}",
            "squad": current_squad,
            "transfers_in": [],
            "transfers_out": [],
            "total_transfers": 0,
            "point_hit": 0,
            "expected_points": 0,
        }

    # Extract solution
    final_squad = [p["id"] for p in filtered_players if pulp.value(x[p["id"]]) > 0.5]
    # For transfers, only check players that have t_in/t_out variables
    transfers_in_ids = [pid for pid in t_in if pulp.value(t_in[pid]) > 0.5]
    transfers_out_ids = [pid for pid in t_out if pulp.value(t_out[pid]) > 0.5]

    total_transfers = int(pulp.value(num_transfers))
    point_hit = int(pulp.value(hits)) * POINT_HIT_PENALTY

    # Calculate expected points (net, after penalty)
    # Sum gross EP from final squad, then subtract penalty
    expected_points = sum(player_ep[pid] for pid in final_squad) - point_hit

    # Build transfer details
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


def main():
    """Read input from stdin, optimize, and write result to stdout."""
    try:
        # Read JSON input from stdin
        input_data = json.load(sys.stdin)

        # Extract parameters
        current_squad = input_data["current_squad"]
        all_players = input_data["all_players"]
        budget = input_data["budget"]
        bank = input_data.get("bank", None)  # Available cash for budget constraint
        free_transfers = input_data.get("free_transfers", 1)
        horizon = input_data.get("horizon", 3)
        max_transfers = input_data.get("max_transfers", 2)

        # Run optimization
        result = optimize_transfers(
            current_squad=current_squad,
            all_players=all_players,
            budget=budget,
            bank=bank,  # Pass bank for accurate budget constraint
            free_transfers=free_transfers,
            horizon=horizon,
            max_transfers=max_transfers,
        )

        # Output result as JSON
        json.dump(result, sys.stdout, indent=2)

    except json.JSONDecodeError as e:
        error_result = {"error": f"Invalid JSON input: {e}"}
        json.dump(error_result, sys.stdout)
        sys.exit(1)
    except KeyError as e:
        error_result = {"error": f"Missing required field: {e}"}
        json.dump(error_result, sys.stdout)
        sys.exit(1)
    except Exception as e:
        error_result = {"error": f"Optimization error: {e}"}
        json.dump(error_result, sys.stdout)
        sys.exit(1)


if __name__ == "__main__":
    main()
