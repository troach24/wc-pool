import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Header } from './components/Header';
import { VerifiedBanner } from './components/VerifiedBanner';
import { TodayMatches } from './components/TodayMatches';
import { Leaderboard } from './components/Leaderboard';
import { useLivePoints } from './hooks/useLivePoints';
import { useDarkMode } from './hooks/useDarkMode';
import { fromRaw } from './lib/adapters';
import rawData from './data/standings.json';

const queryClient = new QueryClient();
const entries = (rawData as any[]).map(fromRaw);

function PoolApp() {
  const { data: livePoints, isFetching } = useLivePoints(entries);
  const { dark, toggle } = useDarkMode();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header liveMatches={livePoints?.liveMatches} dark={dark} onToggleDark={toggle} />
      <main className="max-w-3xl mx-auto px-4 py-4">
        <VerifiedBanner lastUpdated={livePoints?.lastUpdated} isFetching={isFetching} />
        <TodayMatches />
        <Leaderboard entries={entries} livePoints={livePoints} />
        <p className="text-center text-xs text-gray-400 mt-4 pb-6">
          Keeper save counts from organizer sheet · not independently published ·
          player/team points from live incident data
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
