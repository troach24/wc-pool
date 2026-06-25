import { setApiKey } from '../src/lib/api';
import { computeStandings } from '../src/lib/computeStandings';
import { fromRaw } from '../src/lib/adapters';
import rawData from '../src/data/standings.json';

const entries = (rawData as any[]).map(fromRaw);

export const config = { runtime: 'nodejs' };

export default async function handler(_req: Request): Promise<Response> {
  const key = process.env.APIFOOTBALL_KEY;
  if (!key) {
    return Response.json({ error: 'APIFOOTBALL_KEY not configured' }, { status: 500 });
  }
  setApiKey(key);

  try {
    const payload = await computeStandings(entries);

    // Share one computation across all visitors via the edge cache.
    // Refresh fast while matches are live, slow when idle.
    const live = payload.liveMatchCount > 0;
    const sMaxAge = live ? 30 : 600;
    const swr = live ? 60 : 1200;

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: {
        'content-type': 'application/json',
        'cache-control': `public, s-maxage=${sMaxAge}, stale-while-revalidate=${swr}`,
      },
    });
  } catch (err: any) {
    return Response.json({ error: String(err?.message ?? err) }, { status: 502 });
  }
}
