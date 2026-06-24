type Props = {
  lastUpdated?: Date;
  isFetching: boolean;
};

export function VerifiedBanner({ lastUpdated, isFetching }: Props) {
  return (
    <div className="text-xs text-green-800 dark:text-green-300 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg px-3 py-2 mb-3 leading-relaxed">
      ✅ <strong>Live scoring from API-Football.</strong>{' '}
      Goals, assists & cards update every 90s during matches.{' '}
<span className="ml-2 text-green-600">
        {isFetching
          ? '🔄 syncing…'
          : lastUpdated
          ? `· live synced ${lastUpdated.toLocaleTimeString()}`
          : ''}
      </span>
    </div>
  );
}
