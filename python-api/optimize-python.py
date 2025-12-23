#!/usr/bin/env python3
"""
Vercel Serverless Function for FPL Transfer Optimization

This wraps the MILP optimizer for deployment on Vercel's Python runtime.
"""

import json
import sys
import os
from http.server import BaseHTTPRequestHandler
from urllib.parse import parse_qs

# Add python directory to path so we can import the optimizer
# Handle both local development and Vercel deployment paths
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(current_dir)
python_dir = os.path.join(project_root, 'python')

# Ensure the python directory is in the path
if python_dir not in sys.path:
    sys.path.insert(0, python_dir)

from optimize_transfers import optimize_transfers


class handler(BaseHTTPRequestHandler):
    """
    Vercel serverless function handler.

    Expects POST request with JSON body containing optimization parameters.
    """

    def do_POST(self):
        """Handle POST requests"""
        try:
            # Read request body
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            data = json.loads(body.decode('utf-8'))

            # Extract parameters
            current_squad = data['current_squad']
            all_players = data['all_players']
            budget = data['budget']
            bank = data.get('bank', None)
            free_transfers = data.get('free_transfers', 1)
            horizon = data.get('horizon', 3)
            max_transfers = data.get('max_transfers', 2)

            # Run optimization
            result = optimize_transfers(
                current_squad=current_squad,
                all_players=all_players,
                budget=budget,
                bank=bank,
                free_transfers=free_transfers,
                horizon=horizon,
                max_transfers=max_transfers,
            )

            # Send success response
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(result).encode('utf-8'))

        except KeyError as e:
            # Missing required field
            self.send_response(400)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            error = {'error': f'Missing required field: {str(e)}'}
            self.wfile.write(json.dumps(error).encode('utf-8'))

        except json.JSONDecodeError as e:
            # Invalid JSON
            self.send_response(400)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            error = {'error': f'Invalid JSON: {str(e)}'}
            self.wfile.write(json.dumps(error).encode('utf-8'))

        except Exception as e:
            # Optimization failed
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            error = {'error': f'Optimization failed: {str(e)}'}
            self.wfile.write(json.dumps(error).encode('utf-8'))

    def do_GET(self):
        """Handle GET requests - return info about the endpoint"""
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        info = {
            'name': 'FPL Transfer Optimizer',
            'method': 'POST',
            'description': 'MILP-based transfer optimization for Fantasy Premier League'
        }
        self.wfile.write(json.dumps(info).encode('utf-8'))
