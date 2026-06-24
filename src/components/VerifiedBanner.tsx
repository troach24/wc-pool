type Props = {
  lastUpdated?: Date;
  isFetching: boolean;
};

export function VerifiedBanner({ lastUpdated, isFetching }: Props) {
  return (
    <div className="text-xs text-green-800 bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-3 leading-relaxed">
      ✅ <strong>Seed verified vs ESPN / FIFA — June 23, 2026.</strong>{' '}
      Live points from SportAPI7 (SofaScore) · updates every 90s during matches.{' '}
      Corrections applied: <strong>Franco 126→136</strong> ·{' '}
      <strong>Argentina 25→17</strong> (group bonus not yet earned).
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
