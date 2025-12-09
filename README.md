# FPL Team Optimizer

A powerful web application that helps you optimize your Fantasy Premier League team using data-driven analysis and mathematical optimization.

## 🚀 Features

### Current (Phase 1 & 2)

- **Team Analysis**: Enter your FPL team ID to view your current squad
- **Expected Points**: See predicted points for each player based on form and fixtures
- **Squad Visualization**: Interactive display of your starting XI and bench, organized by position
- **Team Statistics**: View team value, bank balance, free transfers, and overall expected points
- **Smart Caching**: Fast performance with intelligent API caching
- **Transfer Optimization**: Get mathematically optimal transfer suggestions using MILP algorithms
- **Point Hit Analysis**: See whether taking -4 point hits is worth it based on expected points gain

### Coming Soon

- **Multi-Transfer Comparison** (Phase 3): Side-by-side comparison of 0, 1, and 2 transfer scenarios
- **Multi-Gameweek Planning** (Phase 4): Plan your transfers across multiple gameweeks
- **Wildcard Optimizer** (Phase 5): Optimize your entire squad when using the wildcard chip

## 🛠️ Tech Stack

- **Frontend**: Next.js 16 with TypeScript, Tailwind CSS
- **Optimization**: Python with PuLP and HiGHS MILP solver
- **Database** (Coming): Supabase (PostgreSQL)
- **Hosting**: Vercel

## 📦 Installation

### Prerequisites

- Node.js 18+ and npm
- Python 3.9+ (for transfer optimization)
- Git

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/Shirazik/fpl-optimizer.git
   cd fpl-optimizer
   ```

2. **Install Node.js dependencies**
   ```bash
   npm install
   ```

3. **Set up Python environment** (for transfer optimization)
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

## 🎮 Usage

### Finding Your Team ID

1. Go to the [Fantasy Premier League website](https://fantasy.premierleague.com/)
2. Log in to your account
3. Click on "Points" or "Transfers" in the navigation
4. Look at the URL in your browser: `fantasy.premierleague.com/entry/YOUR-TEAM-ID/event/XX`
5. Copy your team ID (the number after `/entry/`)

### Analyzing Your Team

1. On the home page, enter your team ID
2. Click "Analyze Team"
3. View your squad with expected points for each player
4. See team statistics including value, bank, and free transfers

### Optimizing Transfers

1. After loading your team, click the "Optimize Transfers" button
2. The MILP optimizer will calculate the best transfers based on:
   - Expected points over the next 3 gameweeks
   - Your available budget (including selling prices)
   - Squad composition rules (positions, team limits)
   - Point hit penalties for extra transfers
3. View suggested transfers with expected point gains
4. See warnings if a point hit is recommended

## 📊 How It Works

### Expected Points Calculation

The app currently uses a **form-based prediction model** that calculates expected points using:
- Player's recent form rating
- Points per game average
- Fixture difficulty (blank/double gameweeks)
- Availability status (injured, suspended, etc.)

**Formula:**
```
base_ep = (form + points_per_game) / 2
adjusted_ep = base_ep × fixture_multiplier × availability_factor
```

### FPL API Integration

The app fetches data from the official Fantasy Premier League API:
- **Bootstrap Data**: All players, teams, and gameweek information (cached for 24 hours)
- **Team Data**: Your current squad and picks (cached for 1 hour)
- **Fixture Data**: Match schedules and difficulty ratings (cached for 1 week)

### Selling Price Calculation

The app correctly implements FPL's **half-profit rule**:
- If a player's price increases after you buy them, you only get half the profit when selling
- If their price decreases, you get their current price
- Example: Buy at £10.0m, rises to £10.4m → Selling price is £10.2m (half of £0.4m profit)

### Transfer Optimization (MILP)

The optimizer uses **Mixed Integer Linear Programming** to find mathematically optimal transfers:

**Decision Variables:**
- `x[player]` = 1 if player is in final squad
- `t_in[player]` = 1 if player transferred in
- `t_out[player]` = 1 if player transferred out

**Objective Function:**
```
Maximize: Σ(expected_points × horizon_weight) - point_hit_penalty
```

**Constraints:**
- Squad size = 15 players
- Positions: 2 GK, 5 DEF, 5 MID, 3 FWD
- Budget: Total cost ≤ available budget
- Team limit: Max 3 players per Premier League team
- Transfer balance: Players in = Players out

**Horizon Weights:**
Future gameweeks are weighted less heavily due to prediction uncertainty:
```
GW1: 1.0, GW2: 0.85, GW3: 0.7, GW4: 0.55, GW5: 0.4
```

## 🗂️ Project Structure

```
fpl-optimizer/
├── app/                    # Next.js app directory
│   ├── page.tsx           # Home page (team ID input)
│   ├── team/[teamId]/     # Team analysis page
│   └── api/               # API routes
│       ├── fpl/           # FPL data endpoints
│       ├── optimize/      # Transfer optimization endpoint
│       └── predictions/   # Prediction endpoints
├── components/            # React components
│   ├── team/             # Team-related components
│   └── transfers/        # Transfer suggestion components
├── lib/                  # Utility libraries
│   ├── fpl-api.ts       # FPL API client
│   ├── optimizer.ts     # Python script caller
│   └── predictions/     # Prediction providers
├── python/              # Python optimization scripts
│   ├── optimize_transfers.py  # MILP transfer optimizer
│   └── requirements.txt       # Python dependencies
├── types/               # TypeScript type definitions
└── public/              # Static assets
```

## 🔧 Configuration

### Environment Variables

Create a `.env.local` file in the root directory (optional for Phase 1):

```bash
# Node environment
NODE_ENV=development

# Prediction providers (optional, for future use)
# FPL_REVIEW_API_KEY=your_api_key_here
```

## 🚀 Deployment

### Deploy to Vercel (Recommended)

1. Push your code to GitHub
2. Go to [Vercel](https://vercel.com/)
3. Import your GitHub repository
4. Vercel will auto-detect Next.js and configure the build
5. Click "Deploy"

Your app will be live at `your-project.vercel.app`

### Build for Production

```bash
npm run build
npm run start
```

## 📝 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Adding Prediction Providers

The app uses a flexible prediction provider system. To add a new provider:

1. Create a new file in `lib/predictions/` (e.g., `fpl-review.ts`)
2. Extend `BasePredictionProvider`
3. Implement the `fetchPredictions` method
4. Register in `lib/predictions/index.ts`

Example:
```typescript
import { BasePredictionProvider } from './base'

export class MyProvider extends BasePredictionProvider {
  name = 'my_provider'

  async fetchPredictions(gameweek: number, horizon: number = 3) {
    // Fetch and return predictions
  }
}
```

## 🧪 Testing

### Manual Testing Checklist

- [ ] Enter valid team ID → Squad displays correctly
- [ ] Enter invalid team ID → Error message shown
- [ ] Private team ID → "Team is private" error
- [ ] Check expected points are calculated
- [ ] Verify captain/vice-captain badges appear
- [ ] Test on mobile device (responsive design)
- [ ] Check injured/suspended player warnings

### Test Team IDs

You can use any public FPL team ID for testing. Some popular managers to try:
- Search for top-ranked teams on the FPL website
- Use your own team ID
- Test with different team formations (3-4-3, 4-3-3, etc.)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development Guidelines

1. Follow TypeScript best practices
2. Use Tailwind CSS for styling
3. Add comments for complex logic
4. Test with multiple team IDs before submitting
5. Keep components small and focused

## 📖 API Documentation

### Internal API Endpoints

#### Get Bootstrap Data
```
GET /api/fpl/bootstrap
```
Returns all FPL players, teams, and gameweek data.

#### Get Team Data
```
GET /api/fpl/team/[teamId]
```
Returns detailed team analysis including squad and statistics.

#### Get Fixtures
```
GET /api/fpl/fixtures?gameweek=XX
```
Returns fixture data, optionally filtered by gameweek.

#### Get Predictions
```
GET /api/predictions?gameweek=XX&horizon=3&playerIds=1,2,3
```
Returns expected points predictions for specified players.

#### Optimize Transfers
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

## 🔮 Roadmap

### Phase 2: Transfer Optimization ✅
- Python MILP optimizer with PuLP and HiGHS
- Single/multi transfer suggestions
- Budget constraint handling
- Position and team limits
- Point hit analysis

### Phase 3: Multi-Transfer Comparison (Next)
- Multi-transfer optimization
- -4 and -8 point hit calculations
- Break-even analysis
- Side-by-side scenario comparison

### Phase 4: Multi-Gameweek Planning
- 3-8 gameweek planning horizon
- Free transfer rollover logic
- Blank and double gameweek handling
- Timeline visualization

### Phase 5: Wildcard Optimization
- Complete squad rebuild optimizer
- Chip timing recommendations
- Visual diff of changes
- Expected points gain analysis

### Future Enhancements
- User accounts and authentication
- Historical recommendation tracking
- Captaincy optimizer
- Bench order optimizer
- Mini-league analysis
- Differential picks analysis
- Risk analysis (floor vs ceiling players)

## 📚 Resources

- [Official FPL Website](https://fantasy.premierleague.com/)
- [r/FantasyPL Subreddit](https://reddit.com/r/FantasyPL)
- [FPL Review](https://fplreview.com/) - Premium predictions and analysis
- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

## 🐛 Troubleshooting

### Common Issues

**"Team not found" error:**
- Double-check your team ID is correct
- Make sure you're using the ID from the URL, not your team name

**"This team is private" error:**
- The team owner has set their team to private
- You can only analyze public teams

**Slow loading:**
- First load may be slow as data is fetched and cached
- Subsequent loads should be much faster

**Expected points show as 0:**
- Predictions are still loading
- Check browser console for any API errors

**Transfer optimization fails:**
- Make sure Python 3.9+ is installed
- Verify the virtual environment is set up: `source venv/bin/activate`
- Check that dependencies are installed: `pip install -r python/requirements.txt`
- Look at the browser console for detailed error messages

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- Fantasy Premier League for the official API
- The FPL community for inspiration and data sources
- PuLP and HiGHS teams for optimization tools

## 📞 Support

If you encounter any issues or have questions:
1. Check the [Troubleshooting](#-troubleshooting) section
2. Search existing GitHub issues
3. Create a new issue with details about your problem

---

**Built with ❤️ for the FPL community**

Happy optimizing! 🏆⚽
