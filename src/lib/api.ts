const BASE = 'https://sportapi7.p.rapidapi.com/api/v1';
const HEADERS = {
  'X-RapidAPI-Key': import.meta.env.VITE_RAPIDAPI_KEY,
  'X-RapidAPI-Host': 'sportapi7.p.rapidapi.com',
};

const WC_TOURNAMENT_ID = 16;
const WC_SEASON_ID = 58210;

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { headers: HEADERS });
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
  return res.json();
}

export type Incident = {
  incidentType: 'goal' | 'card' | 'substitution' | 'period' | 'injuryTime' | 'varDecision' | string;
  incidentClass?: 'yellow' | 'red' | 'regular' | 'penalty' | string;
  player?: { name: string; id: number };
  assist1?: { name: string; id: number };
  isHome?: boolean;
  time?: number;
  id?: number;
};

export type WCEvent = {
  id: number;
  slug: string;
  homeTeam: { name: string; id: number };
  awayTeam: { name: string; id: number };
  homeScore: { current: number };
  awayScore: { current: number };
  status: { description: string; type: string };
  tournament: { uniqueTournament?: { id: number } };
  startTimestamp: number;
};

export type StandingRow = {
  team: { name: string; id: number };
  position: number;
  wins: number;
  scoresFor: number;
  scoresAgainst: number;
  matches: number;
  losses: number;
  draws: number;
};

export async function fetchMatchesForDate(date: string): Promise<WCEvent[]> {
  const data = await get<{ events: WCEvent[] }>(`/sport/football/scheduled-events/${date}`);
  return (data.events ?? []).filter(
    (e) => e.tournament?.uniqueTournament?.id === WC_TOURNAMENT_ID
  );
}

export async function fetchMatchIncidents(eventId: number): Promise<Incident[]> {
  const data = await get<{ incidents: Incident[] }>(`/event/${eventId}/incidents`);
  return data.incidents ?? [];
}

export async function fetchGroupStandings(): Promise<StandingRow[]> {
  const data = await get<{ standings: { rows: StandingRow[] }[] }>(
    `/unique-tournament/${WC_TOURNAMENT_ID}/season/${WC_SEASON_ID}/standings/total`
  );
  return (data.standings ?? []).flatMap((g) => g.rows ?? []);
}
