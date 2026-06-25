type Page = 'standings' | 'schedule';

type Props = {
  page: Page;
  onNavigate: (p: Page) => void;
  hasLive: boolean;
};

export function BottomNav({ page, onNavigate, hasLive }: Props) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
      <div className="mx-auto flex max-w-3xl">
        <button
          onClick={() => onNavigate('standings')}
          className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold uppercase tracking-wide transition-colors ${
            page === 'standings'
              ? 'text-[#1a3a6b] dark:text-blue-400'
              : 'text-gray-400 dark:text-gray-500'
          }`}
        >
          <span className="text-lg leading-none">🏆</span>
          Standings
        </button>
        <button
          onClick={() => onNavigate('schedule')}
          className={`relative flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold uppercase tracking-wide transition-colors ${
            page === 'schedule'
              ? 'text-[#1a3a6b] dark:text-blue-400'
              : 'text-gray-400 dark:text-gray-500'
          }`}
        >
          {hasLive && (
            <span className="absolute top-2 right-[calc(50%-16px)] h-1.5 w-1.5 rounded-full bg-green-500" />
          )}
          <span className="text-lg leading-none">📅</span>
          Schedule
        </button>
      </div>
      {/* iOS safe area */}
      <div className="h-safe-bottom bg-white dark:bg-gray-900" />
    </nav>
  );
}
