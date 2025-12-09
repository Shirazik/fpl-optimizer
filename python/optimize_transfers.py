#!/usr/bin/env python3
"""
FPL Transfer Optimizer using MILP (Mixed Integer Linear Programming)

This script finds the optimal transfer(s) for an FPL squad by solving
a constrained optimization problem using PuLP with the HiGHS solver.

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


def optimize_transfers(
    current_squad: list[int],
    all_players: list[dict[str, Any]],
    budget: float,
    free_transfers: int,
    horizon: int = 3,
    max_transfers: int = 2,
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

    # Create the optimization problem
    prob = pulp.LpProblem("FPL_Transfer_Optimization", pulp.LpMaximize)

    # Decision variables
    # x[i] = 1 if player i is in the final squad
    x = {
        p["id"]: pulp.LpVariable(f"x_{p['id']}", cat="Binary")
        for p in all_players
    }

    # t_in[i] = 1 if player i is transferred in
    t_in = {
        p["id"]: pulp.LpVariable(f"t_in_{p['id']}", cat="Binary")
        for p in all_players
    }

    # t_out[i] = 1 if player i is transferred out
    t_out = {
        p["id"]: pulp.LpVariable(f"t_out_{p['id']}", cat="Binary")
        for p in all_players
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

    # Calculate expected points for all players
    player_ep = {p["id"]: get_expected_points(p) for p in all_players}

    # Auxiliary variable for number of transfers
    num_transfers = pulp.LpVariable("num_transfers", lowBound=0, cat="Integer")

    # Auxiliary variable for point hits (transfers beyond free transfers)
    hits = pulp.LpVariable("hits", lowBound=0, cat="Integer")

    # --- Objective Function ---
    # Maximize expected points minus point hit penalty
    prob += (
        pulp.lpSum(x[p["id"]] * player_ep[p["id"]] for p in all_players)
        - POINT_HIT_PENALTY * hits,
        "Maximize_Expected_Points"
    )

    # --- Constraints ---

    # 1. Squad size must be exactly 15
    prob += (
        pulp.lpSum(x[p["id"]] for p in all_players) == 15,
        "Squad_Size"
    )

    # 2. Position constraints
    for pos, limit in POSITION_LIMITS.items():
        prob += (
            pulp.lpSum(x[p["id"]] for p in all_players if p["position"] == pos) == limit,
            f"Position_{pos}_Limit"
        )

    # 3. Budget constraint
    prob += (
        pulp.lpSum(x[p["id"]] * p["price"] for p in all_players) <= budget,
        "Budget_Constraint"
    )

    # 4. Maximum 3 players per team
    teams = set(p["team"] for p in all_players)
    for team in teams:
        prob += (
            pulp.lpSum(x[p["id"]] for p in all_players if p["team"] == team) <= MAX_PER_TEAM,
            f"Team_{team}_Limit"
        )

    # 5. Transfer logic constraints
    for player in all_players:
        pid = player["id"]
        owned = 1 if pid in current_squad_set else 0

        # t_in[i] = 1 if and only if player was not owned and is now in squad
        # t_in[i] >= x[i] - owned (if not owned and x=1, t_in must be 1)
        prob += t_in[pid] >= x[pid] - owned, f"Transfer_In_Logic_1_{pid}"
        # t_in[i] <= x[i] (can only transfer in if in final squad)
        prob += t_in[pid] <= x[pid], f"Transfer_In_Logic_2_{pid}"
        # t_in[i] <= 1 - owned (can only transfer in if not already owned)
        prob += t_in[pid] <= 1 - owned, f"Transfer_In_Logic_3_{pid}"

        # t_out[i] = 1 if and only if player was owned and is not in final squad
        # t_out[i] >= owned - x[i] (if owned and x=0, t_out must be 1)
        prob += t_out[pid] >= owned - x[pid], f"Transfer_Out_Logic_1_{pid}"
        # t_out[i] <= owned (can only transfer out if owned)
        prob += t_out[pid] <= owned, f"Transfer_Out_Logic_2_{pid}"
        # t_out[i] <= 1 - x[i] (can only transfer out if not in final squad)
        prob += t_out[pid] <= 1 - x[pid], f"Transfer_Out_Logic_3_{pid}"

    # 6. Number of transfers must balance (ins = outs)
    prob += (
        pulp.lpSum(t_in[p["id"]] for p in all_players) ==
        pulp.lpSum(t_out[p["id"]] for p in all_players),
        "Transfer_Balance"
    )

    # 7. Define num_transfers
    prob += (
        num_transfers == pulp.lpSum(t_in[p["id"]] for p in all_players),
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
        return {
            "error": f"Optimization failed with status: {pulp.LpStatus[prob.status]}",
            "squad": current_squad,
            "transfers_in": [],
            "transfers_out": [],
            "total_transfers": 0,
            "point_hit": 0,
            "expected_points": 0,
        }

    # Extract solution
    final_squad = [p["id"] for p in all_players if pulp.value(x[p["id"]]) > 0.5]
    transfers_in_ids = [p["id"] for p in all_players if pulp.value(t_in[p["id"]]) > 0.5]
    transfers_out_ids = [p["id"] for p in all_players if pulp.value(t_out[p["id"]]) > 0.5]

    total_transfers = int(pulp.value(num_transfers))
    point_hit = int(pulp.value(hits)) * POINT_HIT_PENALTY

    # Calculate expected points
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
        free_transfers = input_data.get("free_transfers", 1)
        horizon = input_data.get("horizon", 3)
        max_transfers = input_data.get("max_transfers", 2)

        # Run optimization
        result = optimize_transfers(
            current_squad=current_squad,
            all_players=all_players,
            budget=budget,
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
