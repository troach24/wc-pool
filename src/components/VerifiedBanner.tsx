type Props = {
  lastUpdated?: Date;
  isFetching: boolean;
  liveCount: number;
};

export function VerifiedBanner({ lastUpdated, isFetching, liveCount }: Props) {
  const live = liveCount > 0;

  return (
    <div className="mb-3 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs dark:border-gray-700 dark:bg-gray-800">
      {/* Top row: source badge + sync status */}
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 font-semibold text-gray-700 dark:text-gray-200">
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4 text-green-500"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
            <path d="M16.24 7.76a6 6 0 0 1 0 8.49M7.76 16.24a6 6 0 0 1 0-8.49" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 19.07a10 10 0 0 1 0-14.14" />
          </svg>
          FIFA verified
        </span>

        <span className="flex shrink-0 items-center gap-1.5">
          {live ? (
            <span className="flex items-center gap-1.5 rounded-full bg-red-500/10 px-2 py-0.5 font-semibold text-red-600 dark:text-red-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
              {liveCount} match{liveCount > 1 ? 'es' : ''} live · refreshing 90s
            </span>
          ) : isFetching ? (
            <span className="flex items-center gap-1.5 text-gray-400">
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-gray-500 dark:border-gray-600 dark:border-t-gray-300" />
              syncing…
            </span>
          ) : lastUpdated ? (
            <span className="flex items-center gap-1.5 text-gray-400 dark:text-gray-500">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              synced {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          ) : null}
        </span>
      </div>

    </div>
  );
}
