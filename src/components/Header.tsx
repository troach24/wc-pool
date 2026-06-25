type Props = {
  dark: boolean;
  onToggleDark: () => void;
  todayMatchCount?: number;
};

export function Header({ dark, onToggleDark, todayMatchCount }: Props) {
  return (
    <header className="relative overflow-hidden bg-[#0a1628] px-4 py-5">
      {/* Decorative pitch rings */}
      <div className="pointer-events-none absolute -top-12 -right-8 h-44 w-44 rounded-full border-[28px] border-white/[0.04]" />
      <div className="pointer-events-none absolute -bottom-16 right-12 h-28 w-28 rounded-full border-[20px] border-white/[0.03]" />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(155deg, #0a1628 0%, #1a3a6b 58%, #8b1a2a 100%)',
        }}
      />

      <div className="relative mx-auto max-w-7xl">
        <div className="flex items-start justify-between">
          <div>
            <div className="font-display text-[10px] uppercase tracking-[0.28em] text-white/45">
              World Cup 2026 Pool
            </div>
            <h1 className="font-display text-3xl font-bold uppercase leading-[0.95] tracking-wide text-white sm:text-4xl">
              Heuge Balze{' '}
              <span className="text-[#f0a500]">Standings</span>
            </h1>
            <p className="mt-1 text-xs text-white/55">
              20 entries ·{' '}
              {todayMatchCount != null
                ? todayMatchCount === 0
                  ? 'No matches today'
                  : `${todayMatchCount} match${todayMatchCount > 1 ? 'es' : ''} today`
                : 'Final July 19, 2026'}
            </p>
          </div>

          <button
            onClick={onToggleDark}
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-white/10 text-base transition-colors hover:bg-white/20"
            aria-label="Toggle dark mode"
          >
            {dark ? '☀️' : '🌙'}
          </button>
        </div>

        <div className="mt-3 flex gap-1.5">
          <span className="rounded-full border border-[#f0a500]/30 bg-[#f0a500]/15 px-2.5 py-1 text-xs font-medium text-[#f0a500]">
            🏆 $1,500
          </span>
          <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-xs text-white/75">
            🥇 $1,000
          </span>
          <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-xs text-white/75">
            🥈 $350
          </span>
          <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-xs text-white/75">
            🥉 $150
          </span>
        </div>
      </div>
    </header>
  );
}
