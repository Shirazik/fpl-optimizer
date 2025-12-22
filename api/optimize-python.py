#!/usr/bin/env python3
"""
Vercel Serverless Function for FPL Transfer Optimization

This wraps the MILP optimizer for deployment on Vercel's Python runtime.
"""

import json
import sys
import os

# Add python directory to path so we can import the optimizer
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'python'))

from optimize_transfers import optimize_transfers


def handler(request):
    """
    Vercel serverless function handler.

    Expects POST request with JSON body containing optimization parameters.
    """
    # Parse request body
    try:
        if hasattr(request, 'get_json'):
            # Flask-style request object
            data = request.get_json()
        elif hasattr(request, 'json'):
            # Some WSGI frameworks
            data = request.json
        else:
            # Raw Vercel request - read body directly
            body = request.body if hasattr(request, 'body') else request.read()
            if isinstance(body, bytes):
                body = body.decode('utf-8')
            data = json.loads(body)
    except Exception as e:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': f'Invalid request: {str(e)}'})
        }

    # Extract parameters
    try:
        current_squad = data['current_squad']
        all_players = data['all_players']
        budget = data['budget']
        bank = data.get('bank', None)
        free_transfers = data.get('free_transfers', 1)
        horizon = data.get('horizon', 3)
        max_transfers = data.get('max_transfers', 2)
    except KeyError as e:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': f'Missing required field: {str(e)}'})
        }

    # Run optimization
    try:
        result = optimize_transfers(
            current_squad=current_squad,
            all_players=all_players,
            budget=budget,
            bank=bank,
            free_transfers=free_transfers,
            horizon=horizon,
            max_transfers=max_transfers,
        )

        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps(result)
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': f'Optimization failed: {str(e)}'})
        }
