# World Cup 2026 Pool — Heuge Balze Standings

Live standings site for a private FIFA World Cup 2026 fantasy pool. Points are
computed live from [API-Football](https://www.api-football.com/) — goals,
assists, cards, team bonuses, and keeper saves — and served through a cached
serverless endpoint so API usage stays flat no matter how many people are
watching.

**Live:** https://jacques.life

## Stack

- **Vite + React + TypeScript**, **Tailwind CSS v4**, **TanStack Query**
- **Serverless proxy** (`/api/standings`) that fetches + computes server-side and
  is cached at the Vercel edge (30s while live, 10min idle)
- Hosted on **Vercel**, domain via GoDaddy

## Local development

```bash
npm install
npm run dev          # http://localhost:5173
```

You need an API-Football key in `.env.local` (the Vite dev server runs the
`/api/standings` endpoint locally via middleware, mirroring production):

```bash
# .env.local  (gitignored)
APIFOOTBALL_KEY=your_api_football_key
```

Get a key at https://dashboard.api-football.com — the pool uses **league 1,
season 2026**.

Dev-only: run `__goal('Brazil')` in the browser console to preview the goal
celebration in any team's kit.

## Build

```bash
npm run build
```

This runs `tsc`, `vite build`, then bundles the serverless function with esbuild
into `api/standings.mjs` (required — see "How the API works" below).

## Deploy

The project is connected to Vercel and **auto-deploys on every push to `main`**.

```bash
git add -A
git commit -m "your change"
git push                 # Vercel builds + deploys automatically
```

Watch the deploy: `vercel ls` (most recent should show `● Ready`).

### One-off manual deploy (optional)

```bash
vercel --prod
```

### Environment variable (Vercel)

The API key lives **server-side only** (never in the client bundle). It's already
set in the Vercel project as `APIFOOTBALL_KEY` (Production). To rotate it:

```bash
vercel env rm APIFOOTBALL_KEY production
vercel env add APIFOOTBALL_KEY production   # paste the new key
vercel --prod                               # redeploy to pick it up
```

### Custom domain

`jacques.life` points at Vercel (A record `@ → 76.76.21.21`, CNAME
`www → cname.vercel-dns.com`). Vercel issues HTTPS automatically.

## How the API works

- The browser makes **one** request to `/api/standings` — it never calls
  API-Football directly, and the key is not in the client bundle.
- `api/standings.mjs` is a Vercel serverless function (bundled from
  `server/standings.ts` + `src/lib/*` by the build step, because `type: module`
  otherwise breaks Vercel's native-ESM import resolution).
- It fetches fixtures, standings, and per-fixture player stats, computes every
  pick's value (`src/lib/computeStandings.ts`), and returns JSON with a
  `Cache-Control` header. The Vercel edge cache serves that JSON to all visitors,
  so upstream API-Football calls don't scale with viewer count.
- Finished-fixture stats are cached in the warm instance, so live refreshes only
  re-fetch in-progress matches.

## Updating the roster

`src/data/standings.json` holds **only the roster** — which 9 picks (3 teams, 3
players, 3 keepers) each of the 20 entrants drafted. All point values come from
the live API; the `points` fields in that file are no longer used for scoring.
