// This module is server-only (used by the /api/standings serverless function).
// The key is injected at runtime from process.env — never bundled to the client.
const BASE = 'https://v3.football.api-sports.io';
const WC_LEAGUE_ID = 1;
const WC_SEASON = 2026;

let API_KEY = '';
export function setApiKey(key: string) {
  API_KEY = key;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function get<T>(path: string, attempt = 0): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { headers: { 'x-apisports-key': API_KEY } });
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
  const json = await res.json();
  if (json.errors && Object.keys(json.errors).length) {
    // The per-minute cap returns a soft error — back off and retry briefly.
    if (json.errors.rateLimit && attempt < 3) {
      await sleep(2500 * (attempt + 1));
      return get<T>(path, attempt + 1);
    }
    throw new Error(`API error: ${JSON.stringify(json.errors)}`);
  }
  return json.response as T;
}

// ---- Normalized shapes used across the app ----

// One player's stat line within a single fixture.
export type PlayerLine = {
  name: string;
  teamId: number;
  teamName: string; // national team — used to disambiguate shared surnames
  position: string | null; // 'G' | 'D' | 'M' | 'F'
  minutes: number | null;
  goals: number;
  assists: number;
  yellow: number;
  red: number;
  saves: number;
};

export type WCEvent = {
  id: number;
  homeTeam: { name: string; id: number };
  awayTeam: { name: string; id: number };
  homeScore: { current: number };
  awayScore: { current: number };
  status: { description: string; type: 'notstarted' | 'inprogress' | 'finished' };
  tournament: { groupSign?: string };
  startTimestamp: number;
};

export type StandingRow = {
  team: { name: string; id: number };
  position: number;
  wins: number;
  scoresFor: number;
  scoresAgainst: number;
  matches: number;
  group?: string;
};

// ---- API-Football raw shapes (only fields we read) ----

type AFFixture = {
  fixture: {
    id: number;
    timestamp: number;
    status: { long: string; short: string; elapsed: number | null };
  };
  teams: {
    home: { id: number; name: string };
    away: { id: number; name: string };
  };
  goals: { home: number | null; away: number | null };
  league: { round: string };
};

type AFPlayersResp = Array<{
  team: { id: number; name: string };
  players: Array<{
    player: { name: string };
    statistics: Array<{
      games: { position: string | null; minutes: number | null };
      goals: { total: number | null; assists: number | null; saves: number | null };
      cards: { yellow: number | null; red: number | null };
    }>;
  }>;
}>;

const LIVE_CODES = new Set(['1H', '2H', 'HT', 'ET', 'BT', 'P', 'LIVE', 'INT']);
const DONE_CODES = new Set(['FT', 'AET', 'PEN']);

function mapStatus(short: string): WCEvent['status']['type'] {
  if (LIVE_CODES.has(short)) return 'inprogress';
  if (DONE_CODES.has(short)) return 'finished';
  return 'notstarted';
}

function shortStatusLabel(short: string, elapsed: number | null): string {
  if (short === 'HT') return 'HT';
  if (short === '1H') return elapsed ? `${elapsed}'` : '1st';
  if (short === '2H') return elapsed ? `${elapsed}'` : '2nd';
  if (short === 'ET') return elapsed ? `${elapsed}'` : 'ET';
  if (DONE_CODES.has(short)) return 'FT';
  return short;
}

function toWCEvent(f: AFFixture, groupByTeam: Map<number, string>): WCEvent {
  return {
    id: f.fixture.id,
    homeTeam: { name: f.teams.home.name, id: f.teams.home.id },
    awayTeam: { name: f.teams.away.name, id: f.teams.away.id },
    homeScore: { current: f.goals.home ?? 0 },
    awayScore: { current: f.goals.away ?? 0 },
    status: {
      description: shortStatusLabel(f.fixture.status.short, f.fixture.status.elapsed),
      type: mapStatus(f.fixture.status.short),
    },
    tournament: { groupSign: groupByTeam.get(f.teams.home.id) },
    startTimestamp: f.fixture.timestamp,
  };
}

// ---- Public fetchers ----

export async function fetchWCStandings(): Promise<StandingRow[]> {
  type Resp = Array<{
    league: {
      standings: Array<
        Array<{
          rank: number;
          group: string;
          team: { id: number; name: string };
          all: { played: number; win: number; goals: { for: number; against: number } };
        }>
      >;
    };
  }>;
  const resp = await get<Resp>(`/standings?league=${WC_LEAGUE_ID}&season=${WC_SEASON}`);
  const groups = resp[0]?.league.standings ?? [];
  return groups.flatMap((g) =>
    g.map((r) => ({
      team: { name: r.team.name, id: r.team.id },
      position: r.rank,
      wins: r.all.win,
      scoresFor: r.all.goals.for,
      scoresAgainst: r.all.goals.against,
      matches: r.all.played,
      group: r.group,
    }))
  );
}

// Returns all WC fixtures plus a team→group-letter map (from standings groups).
export async function fetchWCFixtures(
  groupByTeam: Map<number, string>
): Promise<WCEvent[]> {
  const resp = await get<AFFixture[]>(`/fixtures?league=${WC_LEAGUE_ID}&season=${WC_SEASON}`);
  return resp.map((f) => toWCEvent(f, groupByTeam));
}

// Per-player stat lines for one fixture — goals, assists, cards AND keeper saves.
export async function fetchFixturePlayers(fixtureId: number): Promise<PlayerLine[]> {
  const resp = await get<AFPlayersResp>(`/fixtures/players?fixture=${fixtureId}`);
  const out: PlayerLine[] = [];
  for (const team of resp) {
    for (const p of team.players) {
      const s = p.statistics[0];
      if (!s) continue;
      out.push({
        name: p.player.name,
        teamId: team.team.id,
        teamName: team.team.name,
        position: s.games?.position ?? null,
        minutes: s.games?.minutes ?? null,
        goals: s.goals?.total ?? 0,
        assists: s.goals?.assists ?? 0,
        yellow: s.cards?.yellow ?? 0,
        red: s.cards?.red ?? 0,
        saves: s.goals?.saves ?? 0,
      });
    }
  }
  return out;
}

// Builds team-id → group-letter ("A", "B", …) from standings group names.
export function groupLetterMap(standings: StandingRow[]): Map<number, string> {
  const m = new Map<number, string>();
  for (const r of standings) {
    const letter = r.group?.replace(/^Group\s+/i, '').trim();
    if (letter) m.set(r.team.id, letter);
  }
  return m;
}
