// Bundles the serverless function into a single self-contained file so Vercel's
// native-ESM runtime has no extensionless ../src imports to resolve.
import { build } from 'esbuild';

await build({
  entryPoints: ['server/standings.ts'],
  outfile: 'api/standings.mjs',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  loader: { '.json': 'json' },
});

console.log('bundled → api/standings.mjs');
