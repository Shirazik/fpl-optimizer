# FPL Transfer Optimizer

Get mathematically optimal transfer suggestions for your Fantasy Premier League team.

## What It Does

Enter your FPL team ID → Get optimal transfer recommendations based on:
- **Expected points** over the next 3 gameweeks
- **Budget constraints** (including selling prices)
- **Squad composition rules** (positions, team limits)
- **Point hit analysis** (-4 penalty for extra transfers)

Uses **Mixed Integer Linear Programming (MILP)** to guarantee mathematically optimal results.

## Tech Stack

- **Frontend**: Next.js 15 with TypeScript, Tailwind CSS
- **Optimization**: Python with PuLP and HiGHS MILP solver
- **Hosting**: Vercel

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.9+

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Shirazik/fpl-optimizer.git
   cd fpl-optimizer
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Python environment** (for optimizer)
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r python/requirements.txt
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## How to Use

1. Find your FPL team ID:
   - Go to [Fantasy Premier League](https://fantasy.premierleague.com/)
   - Log in and go to your team page
   - Look at the URL: `fantasy.premierleague.com/entry/YOUR-TEAM-ID/event/XX`
   - Copy the number after `/entry/`

2. Enter your team ID on the home page

3. Click "Get Transfer Suggestions"

4. View your optimal transfers with:
   - Players to transfer in/out
   - Expected points gain
   - Whether a point hit is worth it

## How It Works

### MILP Optimization

The optimizer uses **Mixed Integer Linear Programming** to find mathematically optimal transfers.

**Decision Variables:**
- `x[player]` = 1 if player is in final squad, 0 otherwise
- `t_in[player]` = 1 if player transferred in
- `t_out[player]` = 1 if player transferred out

**Objective Function:**
```
Maximize: Σ(expected_points × horizon_weight) - point_hit_penalty
```

**Constraints:**
- Squad size = 15 players
- Positions: 2 GK, 5 DEF, 5 MID, 3 FWD
- Budget: Total cost ≤ available budget (including selling prices)
- Team limit: Max 3 players per Premier League team
- Transfer balance: Players in = Players out

**Horizon Weights:**
Future gameweeks are weighted less due to prediction uncertainty:
```
GW1: 1.0, GW2: 0.85, GW3: 0.7
```

### Expected Points Calculation

Currently uses a form-based model:
```
base_ep = (form + points_per_game) / 2
adjusted_ep = base_ep × fixture_multiplier × availability_factor
```

Factors in:
- Recent form rating
- Points per game average
- Fixture difficulty
- Player availability (injured/suspended)

### Selling Price Calculation

Implements FPL's "half-profit rule":
- If price rises after purchase: selling price = purchase price + (profit / 2)
- If price falls: selling price = current price
- Example: Buy at £10.0m, rises to £10.4m → Sell at £10.2m

## Project Structure

```
fpl-optimizer/
├── app/
│   ├── page.tsx                      # Home page (team ID input)
│   ├── optimize/[teamId]/page.tsx    # Optimization results page
│   ├── layout.tsx                    # Root layout
│   ├── globals.css                   # Styles
│   └── api/
│       ├── optimize/transfer/        # Optimization endpoint
│       └── fpl/                      # FPL data endpoints
├── components/
│   └── transfers/                    # Transfer suggestion components
├── lib/
│   ├── fpl-api.ts                   # FPL API client
│   └── optimizer.ts                 # Python script caller
├── python/
│   ├── optimize_transfers.py        # MILP optimizer
│   └── requirements.txt             # Python dependencies
└── types/                           # TypeScript type definitions
```

## Development

### Available Commands

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

### Testing the Optimizer

```bash
# Activate Python environment
source venv/bin/activate

# Test optimizer directly
python python/optimize_transfers.py < test_input.json
```

## API Endpoints

### Optimize Transfers
```
POST /api/optimize/transfer
Content-Type: application/json

{
  "teamId": "123456",
  "maxTransfers": 2,
  "horizon": 3
}
```

Returns optimal transfer suggestions with expected point gains.

## Deployment

### Deploy to Vercel

1. Push code to GitHub
2. Import repository in [Vercel](https://vercel.com/)
3. Deploy

Vercel will auto-detect Next.js configuration.

## Troubleshooting

**"Team not found" error:**
- Double-check your team ID
- Make sure you're using the number from the URL

**"This team is private" error:**
- The team owner has set their team to private
- Only public teams can be analyzed

**Optimization fails:**
- Make sure Python 3.9+ is installed
- Verify virtual environment is activated: `source venv/bin/activate`
- Check dependencies are installed: `pip install -r python/requirements.txt`

## Why MILP?

FPL transfer optimization is a **constrained optimization problem**. MILP solvers:
- Guarantee mathematical optimality
- Handle complex constraints efficiently
- Scale better than brute force or genetic algorithms
- Provide deterministic, reproducible results

## License

MIT License - see [LICENSE](LICENSE)

## Acknowledgments

- Fantasy Premier League for the official API
- PuLP and HiGHS teams for optimization tools
- The FPL community for inspiration

---

**Built for FPL managers who want to win** ⚽
