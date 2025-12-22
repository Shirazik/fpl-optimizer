# Repository Guidelines

Short guide for contributors building and shipping changes in this Next.js + Python optimizer project.

## Project Structure & Module Organization
- `app/`: App Router pages and API routes; `page.tsx` (landing) and `team/[teamId]/` for team analysis.
- `components/`: Reusable UI pieces; keep feature-specific subfolders (team, transfers).
- `lib/`: Domain helpers (FPL API client, optimizer bridge, prediction utilities); prefer colocated logic over sprawling utils.
- `python/`: MILP optimizer scripts and `requirements.txt`; activate `venv/` before running.
- `types/`: Shared TypeScript definitions; `public/` for static assets; `.env.example` shows expected config keys.

## Build, Test, and Development Commands
- `npm run dev`: Start Next dev server at `http://localhost:3000`.
- `npm run build`: Production build and type checks; run before deploys.
- `npm run start`: Serve the built app locally.
- `npm run lint`: ESLint (Next core-web-vitals); fix warnings before opening a PR.
- Python setup: `python3 -m venv venv && source venv/bin/activate && pip install -r python/requirements.txt`; run `python python/optimize_transfers.py --help` to validate the solver entrypoint.

## Coding Style & Naming Conventions
- TypeScript, functional React components, App Router conventions; add `use client` only when hooks or browser APIs require it.
- Styling uses Tailwind with design tokens (`text-text-primary`, `btn`, `card`, etc.); prefer utility classes over inline styles.
- Use PascalCase for components, camelCase for variables/functions, `useX` for hooks; match existing 2-space indent and single quotes.
- Keep API route segments aligned to feature (`app/api/fpl`, `app/api/optimize`, `app/api/predictions`); keep business logic in `lib/` instead of API handlers.

## Testing Guidelines
- No automated test suite yet; prioritize linting plus manual checks for new features.
- When adding tests, colocate as `*.test.ts(x)` or under `__tests__/`, and exercise API handlers and critical transforms in `lib/`.
- Aim for small, deterministic fixtures over network calls; document any solver assumptions in test names.

## Commit & Pull Request Guidelines
- Commit messages follow conventional prefixes seen in history (`feat:`, `docs:`, etc.); keep the scope concise.
- For PRs: include a short summary, linked issue/goal, screenshots or before/after notes for UI, and any env/config changes.
- Confirm `npm run lint` and (if touched) Python setup steps succeed before requesting review.

## Security & Configuration Tips
- Keep secrets in `.env.local`; never commit `.env*` files. Use `.env.example` as a template.
- Python solver dependencies may differ by platform—rebuild the virtualenv when changing versions or switching machines.
