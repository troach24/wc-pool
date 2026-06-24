import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Header } from './components/Header';
import { VerifiedBanner } from './components/VerifiedBanner';
import { LiveBanner } from './components/LiveBanner';
import { Leaderboard } from './components/Leaderboard';
import { StandingsGrid } from './components/StandingsGrid';
import { useLivePoints } from './hooks/useLivePoints';
import { useDarkMode } from './hooks/useDarkMode';
import { fromRaw } from './lib/adapters';
import rawData from './data/standings.json';

const queryClient = new QueryClient();
const entries = (rawData as any[]).map(fromRaw);

function PoolApp() {
  const { data: livePoints, isFetching, isError } = useLivePoints(entries);
  const { dark, toggle } = useDarkMode();
  const [view, setView] = useState<'cards' | 'grid'>(
    () => window.innerWidth >= 768 ? 'grid' : 'cards'
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header dark={dark} onToggleDark={toggle} />
      <main className={`mx-auto px-4 py-4 ${view === 'grid' ? 'max-w-7xl' : 'max-w-3xl'}`}>
        {livePoints && (
          <LiveBanner matchImpacts={livePoints.matchImpacts} isFetching={isFetching} />
        )}
        <VerifiedBanner lastUpdated={livePoints?.lastUpdated} isFetching={isFetching} />

        {/* View toggle */}
        <div className="flex items-center gap-3 mb-3">
          <div className="flex gap-1 bg-gray-200 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setView('cards')}
              className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                view === 'cards'
                  ? 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              🃏 Cards
            </button>
            <button
              onClick={() => setView('grid')}
              className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                view === 'grid'
                  ? 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              📊 Grid
            </button>
          </div>
          {view === 'grid' && (
            <span className="text-xs text-gray-400 dark:text-gray-500 sm:hidden">
              ← scroll for all picks
            </span>
          )}
          {view === 'cards' && (
            <span className="text-xs text-gray-400 dark:text-gray-500 hidden sm:inline">
              Grid view best on wider screens
            </span>
          )}
        </div>

        {livePoints ? (
          view === 'cards'
            ? <Leaderboard entries={entries} livePoints={livePoints} />
            : <StandingsGrid entries={entries} livePoints={livePoints} />
        ) : isError ? (
          <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-6 text-center text-sm text-red-700 dark:text-red-300">
            Couldn't reach the live stats feed. Retrying…
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-16 text-gray-400 dark:text-gray-500">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-[#1a3a6b] dark:border-gray-600 dark:border-t-blue-400" />
            <span className="text-sm">Loading live standings…</span>
          </div>
        )}

        <p className="text-center text-xs text-gray-400 dark:text-gray-600 mt-4 pb-6">
          All points computed live from API-Football · goals, assists, cards & keeper saves
        </p>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <PoolApp />
    </QueryClientProvider>
  );
}
