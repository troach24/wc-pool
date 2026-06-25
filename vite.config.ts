import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Serves /api/standings during `npm run dev` so local testing matches prod
// (in production this is a Vercel serverless function).
function devStandingsApi(key: string): Plugin {
  return {
    name: 'dev-standings-api',
    configureServer(server) {
      server.middlewares.use('/api/standings', async (_req, res) => {
        try {
          const { setApiKey } = await server.ssrLoadModule('/src/lib/api.ts')
          const { computeStandings } = await server.ssrLoadModule('/src/lib/computeStandings.ts')
          const { fromRaw } = await server.ssrLoadModule('/src/lib/adapters.ts')
          const rawData = (await server.ssrLoadModule('/src/data/standings.json')).default
          setApiKey(key)
          const entries = (rawData as any[]).map(fromRaw)
          const payload = await computeStandings(entries)
          res.setHeader('content-type', 'application/json')
          res.end(JSON.stringify(payload))
        } catch (e: any) {
          res.statusCode = 502
          res.end(JSON.stringify({ error: String(e?.message ?? e) }))
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [
      react(),
      tailwindcss(),
      devStandingsApi(env.APIFOOTBALL_KEY ?? ''),
    ],
  }
})
