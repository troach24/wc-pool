import { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Header } from './components/Header';
import { VerifiedBanner } from './components/VerifiedBanner';
import { LiveBanner } from './components/LiveBanner';
import { Leaderboard } from './components/Leaderboard';
import { StandingsGrid } from './components/StandingsGrid';
import { RulesPopover } from './components/RulesPopover';
import { GoalAnimation } from './components/GoalAnimation';
import { SchedulePage } from './components/SchedulePage';
import { ChatPage } from './components/ChatPage';
import { BottomNav } from './components/BottomNav';
import { useLivePoints } from './hooks/useLivePoints';
import { supabase } from './lib/supabase';
import { useDarkMode } from './hooks/useDarkMode';
import { fromRaw } from './lib/adapters';
import { teamKit, type TeamKit } from './lib/teamKits';
import rawData from './data/standings.json';

const queryClient = new QueryClient();
const entries = (rawData as any[]).map(fromRaw);

function PoolApp() {
  const { data: livePoints, isFetching, isError } = useLivePoints();
  const { dark, toggle } = useDarkMode();
  const [view, setView] = useState<'cards' | 'grid'>(
    () => window.innerWidth >= 768 ? 'grid' : 'cards'
  );
  const [page, setPage] = useState<'standings' | 'schedule' | 'chat'>('standings');
  const [unreadChat, setUnreadChat] = useState(false);

  // Fire the goal animation whenever the server's goalSeq counter increases.
  // Each increment = one new goal detected. The client stores the last seq it
  // celebrated so every goal triggers every user exactly once.
  const [goal, setGoal] = useState<{ key: number; kit: TeamKit } | null>(null);
  useEffect(() => {
    if (!livePoints) return;
    const seq = livePoints.goalSeq;
    if (seq === 0) return;
    let lastSeq = 0;
    try { lastSeq = Number(localStorage.getItem('wc:lastGoalSeq')) || 0; } catch { /* ignore */ }
    if (seq <= lastSeq) return;
    try { localStorage.setItem('wc:lastGoalSeq', String(seq)); } catch { /* ignore */ }
    if (livePoints.goalTeam) {
      setGoal({ key: Date.now(), kit: teamKit(livePoints.goalTeam) });
    }
  }, [livePoints]);

  // Dev-only: run `__goal('Brazil')` in the console to preview a team's kit.
  useEffect(() => {
    if (import.meta.env.DEV) {
      (window as any).__goal = (team = 'USA') =>
        setGoal({ key: Date.now(), kit: teamKit(team) });
    }
  }, []);

  const hasLive = (livePoints?.liveMatchCount ?? 0) > 0;

  // Show unread dot when a new message arrives and chat tab isn't open
  useEffect(() => {
    const channel = supabase
      .channel('unread')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
        setUnreadChat((prev) => page !== 'chat' || prev);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [page]);

  return (
    <div className="min-h-screen bg-gray-50 pb-16 dark:bg-gray-900">
      {goal && <GoalAnimation key={goal.key} kit={goal.kit} onDone={() => setGoal(null)} />}
      <Header dark={dark} onToggleDark={toggle} todayMatchCount={livePoints?.todayMatchCount} />
      {page === 'chat' ? (
        <ChatPage />
      ) : page === 'schedule' && livePoints ? (
        <SchedulePage
          allFixtures={livePoints.allFixtures}
          matchImpacts={livePoints.allMatchImpacts}
          entries={entries}
        />
      ) : (
      <main className={`mx-auto px-4 py-4 ${view === 'grid' ? 'max-w-7xl' : 'max-w-3xl'}`}>
        {livePoints && (
          <LiveBanner matchImpacts={livePoints.matchImpacts} isFetching={isFetching} lastUpdated={livePoints.lastUpdated} />
        )}
        {!hasLive && (
          <VerifiedBanner
            lastUpdated={livePoints?.lastUpdated}
            isFetching={isFetching}
            liveCount={0}
          />
        )}

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
          <div className="ml-auto">
            <RulesPopover />
          </div>
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
      )}
      <BottomNav
        page={page}
        onNavigate={(p) => {
          if (p === 'chat') setUnreadChat(false);
          setPage(p);
        }}
        hasLive={hasLive}
        unreadChat={unreadChat}
      />
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
