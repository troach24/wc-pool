import { useState, useEffect, useMemo, useRef } from 'react';
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
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const filteredEntries = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((entry) => {
      const picks = [...entry.teams, ...entry.players, ...entry.keepers];
      return picks.some((pick) => pick.label.toLowerCase().includes(q));
    });
  }, [search]);

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  // Fire the goal animation when client-side score diffing detects a new goal.
  // lastCelebrated is a session ref — resets on page load so no stale replays.
  const GOAL_WINDOW_MS = 10 * 60 * 1000; // show animation if goal scored within last 10 min
  const lastCelebrated = useRef(0);
  const [goal, setGoal] = useState<{ key: number; kit: TeamKit } | null>(null);
  useEffect(() => {
    if (!livePoints) return;
    const { goalSeq: seq, goalTeam, goalAt } = livePoints;
    if (seq === 0 || seq <= lastCelebrated.current) return;
    const fresh = goalAt ? (Date.now() - new Date(goalAt).getTime()) < GOAL_WINDOW_MS : false;
    lastCelebrated.current = seq;
    if (goalTeam && fresh) {
      setGoal({ key: Date.now(), kit: teamKit(goalTeam) });
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
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => {
                setSearchOpen((o) => {
                  const next = !o;
                  if (!next) setSearch('');
                  return next;
                });
              }}
              aria-expanded={searchOpen}
              aria-label="Search"
              className={`flex items-center justify-center rounded-lg border p-1.5 text-sm transition-colors ${
                searchOpen
                  ? 'border-[#1a3a6b]/40 bg-[#1a3a6b]/10 text-[#1a3a6b] dark:border-blue-400/40 dark:bg-blue-400/10 dark:text-blue-300'
                  : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              🔍
            </button>
            <RulesPopover />
          </div>
        </div>

        {/* Search */}
        {searchOpen && (
          <div className="relative mb-3">
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setSearch('');
                  setSearchOpen(false);
                }
              }}
              placeholder="Search teams, players, keepers…"
              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 pr-8 text-sm text-gray-800 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#1a3a6b] dark:focus:ring-blue-500"
            />
            <button
              onClick={() => {
                if (search) setSearch('');
                else setSearchOpen(false);
              }}
              aria-label={search ? 'Clear search' : 'Close search'}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
            >
              ✕
            </button>
          </div>
        )}

        {livePoints ? (
          filteredEntries.length === 0 ? (
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-10 text-center text-sm text-gray-400 dark:text-gray-500">
              No matches for "{search}"
            </div>
          ) : view === 'cards'
            ? <Leaderboard entries={filteredEntries} livePoints={livePoints} />
            : <StandingsGrid entries={filteredEntries} livePoints={livePoints} />
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
