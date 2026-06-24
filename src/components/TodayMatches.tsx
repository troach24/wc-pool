import { useTodayMatches } from '../hooks/useLiveMatches';

export function TodayMatches() {
  const { data: matches, isLoading } = useTodayMatches();

  if (isLoading || !matches?.length) return null;

  return (
    <div className="mb-3">
      <h2 className="text-xs font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">Today's Matches</h2>
      <div className="flex flex-col gap-1.5">
        {matches.map((m) => {
          const live = m.status.type === 'inprogress';
          const ended = m.status.type === 'finished';
          return (
            <div
              key={m.id}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm border ${
                live
                  ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                  : ended
                  ? 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
              }`}
            >
              {live && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />}
              <span className="flex-1 font-medium text-gray-800 dark:text-gray-100">
                {m.homeTeam.name} <span className="text-gray-400 font-normal">vs</span> {m.awayTeam.name}
              </span>
              {(live || ended) ? (
                <span className="font-bold text-gray-700 dark:text-gray-200">
                  {m.homeScore.current}–{m.awayScore.current}
                </span>
              ) : (
                <span className="text-gray-400 text-xs">
                  {new Date(m.startTimestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                live ? 'bg-red-500 text-white' :
                ended ? 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300' : 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
              }`}>
                {live ? 'LIVE' : ended ? 'FT' : 'upcoming'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
