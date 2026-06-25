type Props = {
  lastUpdated?: Date;
  isFetching: boolean;
  liveCount: number;
};

export function VerifiedBanner({ lastUpdated, isFetching, liveCount }: Props) {
  const live = liveCount > 0;

  return (
    <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs dark:border-gray-700 dark:bg-gray-800">
      {/* Source badge */}
      <span className="flex items-center gap-1.5 font-semibold text-gray-700 dark:text-gray-200">
        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-green-500 text-[9px] text-white">
          ✓
        </span>
        API-Football
        <span className="font-normal text-gray-400 dark:text-gray-500">· FIFA verified</span>
      </span>

      <span className="hidden text-gray-300 dark:text-gray-600 sm:inline">|</span>

      {/* What's scored */}
      <span className="text-gray-500 dark:text-gray-400">
        Goals · assists · cards · keeper saves — all live
      </span>

      {/* Live / sync status, pushed right */}
      <span className="ml-auto flex items-center gap-1.5">
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
  );
}
