import { useState, useRef, useEffect } from 'react';

const TEAM: [string, string][] = [
  ['Goal scored', '+1'],
  ['Clean sheet', '+3'],
  ['Group-stage win', '+3'],
  ['Win group (1st)', '+8'],
  ['2nd in group', '+4'],
  ['3rd & qualified', '+2'],
  ['Round of 32 win', '+5'],
  ['Round of 16 win', '+5'],
  ['Quarterfinal win', '+5'],
  ['Semifinal win', '+5'],
  ['3rd place', '+7'],
  ['Runner-up', '+10'],
  ['Winner', '+15'],
];
const PLAYER: [string, string][] = [
  ['Goal', '+5'],
  ['Assist', '+3'],
  ['Yellow card', '+10'],
  ['Red card', '+15'],
];
const KEEPER: [string, string][] = [
  ['Win', '+3'],
  ['Clean sheet', '+3'],
  ['Save', '+1'],
];

function Column({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <div>
      <h5 className="mb-1.5 font-display text-[10px] font-bold uppercase tracking-[0.12em] text-[#f0a500]">
        {title}
      </h5>
      <ul className="flex flex-col gap-1">
        {rows.map(([label, pts]) => (
          <li key={label} className="flex items-center justify-between gap-2 text-xs">
            <span className="text-white/70">{label}</span>
            <span className="font-bold text-[#f0a500] tabular-nums">{pts}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function RulesPopover() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
          open
            ? 'border-[#f0a500]/50 bg-[#0a1628] text-[#f0a500]'
            : 'border-[#f0a500]/30 bg-[#0a1628] text-[#f0a500] hover:bg-[#13233f]'
        }`}
      >
        <span aria-hidden="true">📋</span> Scoring rules
      </button>

      {open && (
        <div
          className="absolute right-0 z-30 mt-2 w-[min(88vw,460px)] overflow-hidden rounded-xl border border-[#f0a500]/20 p-4 shadow-2xl"
          style={{ background: 'linear-gradient(160deg, #0d1f3a 0%, #0a1628 100%)' }}
        >
          <div className="grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-3">
            <Column title="⚽ Team" rows={TEAM} />
            <Column title="🌟 Player" rows={PLAYER} />
            <Column title="🧤 Keeper" rows={KEEPER} />
          </div>
          <p className="mt-3 border-t border-white/10 pt-2 text-[11px] text-white/45">
            Cards score positive points — intentional. Knockout-round and
            group-finish bonuses apply once mathematically clinched.
          </p>
        </div>
      )}
    </div>
  );
}
