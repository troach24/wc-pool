import { setApiKey } from '../src/lib/api';
import { computeStandings } from '../src/lib/computeStandings';
import { fromRaw } from '../src/lib/adapters';
import rawData from '../src/data/standings.json';

const entries = (rawData as any[]).map(fromRaw);

export default async function handler(_req: any, res: any) {
  const key = process.env.APIFOOTBALL_KEY;
  if (!key) {
    res.status(500).json({ error: 'APIFOOTBALL_KEY not configured' });
    return;
  }
  setApiKey(key);

  try {
    const payload = await computeStandings(entries);

    // Share one computation across all visitors via the edge cache.
    // Refresh fast while matches are live, slow when idle,
    // and medium when a kickoff is within the next 15 minutes.
    const live = payload.liveMatchCount > 0;
    const imminent = !live && payload.allFixtures.some((f) => {
      const msUntil = f.startTimestamp * 1000 - Date.now();
      return msUntil > 0 && msUntil < 15 * 60 * 1000;
    });
    const sMaxAge = live ? 30 : imminent ? 60 : 600;
    const swr = live ? 60 : imminent ? 120 : 1200;

    res.setHeader('Cache-Control', `public, s-maxage=${sMaxAge}, stale-while-revalidate=${swr}`);
    res.status(200).json(payload);
  } catch (err: any) {
    res.status(502).json({ error: String(err?.message ?? err) });
  }
}
