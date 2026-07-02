import { useState } from 'react';
import type { Entry } from '../lib/types';
import type { WCEvent } from '../lib/api';
import type { PickImpact } from '../lib/pointCalc';
import { PickBreakdownModal } from './PickBreakdownModal';

const MEDALS = ['🥇', '🥈', '🥉'];

type MatchImpact = { event: WCEvent; impacts: PickImpact[] };

function PickChip({
  label,
  value,
  live,
  allFixtures,
  allMatchImpacts,
  pickToTeam,
  pickGroupBonus,
  pickExcludedFixtures,
}: {
  label: string;
  value: number;
  live: boolean;
  allFixtures: WCEvent[];
  allMatchImpacts: MatchImpact[];
  pickToTeam: Map<string, string>;
  pickGroupBonus: Map<string, number>;
  pickExcludedFixtures: Map<string, number[]>;
}) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        className="w-full flex items-center justify-between gap-2 py-1 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded px-1 -mx-1 transition-colors"
        onClick={() => setShowModal(true)}
      >
        <span className="text-sm text-gray-700 dark:text-gray-300 text-left">{label}</span>
        <div className="flex items-center gap-1 flex-shrink-0">
          {live && (
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" title="scoring live" />
          )}
          <span
            className={`text-xs font-bold px-2 py-0.5 rounded-full min-w-[36px] text-center ${
              value === 0
                ? 'bg-gray-100 dark:bg-gray-700 text-gray-400'
                : 'bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
            }`}
          >
            +{value}
          </span>
        </div>
      </button>
      {showModal && (
        <PickBreakdownModal
          label={label}
          allFixtures={allFixtures}
          allMatchImpacts={allMatchImpacts}
          pickToTeam={pickToTeam}
          pickGroupBonus={pickGroupBonus}
          pickExcludedFixtures={pickExcludedFixtures}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}

type Props = {
  entry: Entry;
  rank: number;
  total: number;
  pickValues: Map<string, number>;
  livePickLabels: Set<string>;
  allFixtures: WCEvent[];
  allMatchImpacts: MatchImpact[];
  pickToTeam: Map<string, string>;
  pickGroupBonus: Map<string, number>;
  pickExcludedFixtures: Map<string, number[]>;
  eliminatedTeams: Set<string>;
};

export function EntryCard({ entry, rank, total, pickValues, livePickLabels, allFixtures, allMatchImpacts, pickToTeam, pickGroupBonus, pickExcludedFixtures, eliminatedTeams }: Props) {
  const [open, setOpen] = useState(false);

  const displayTotal = total;
  const allPicks = [...entry.teams, ...entry.players, ...entry.keepers];
  const hasLivePick = allPicks.some((p) => livePickLabels.has(p.label));
  const aliveCount = allPicks.filter((p) => {
    const team = pickToTeam.get(p.label);
    return team ? !eliminatedTeams.has(team) : false;
  }).length;

  const borderClass =
    rank === 1
      ? 'border-l-4 border-l-yellow-400'
      : rank === 2
      ? 'border-l-4 border-l-gray-400'
      : rank === 3
      ? 'border-l-4 border-l-amber-600'
      : '';

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm hover:shadow-md transition-shadow ${borderClass}`}
    >
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="text-lg font-black min-w-[28px] text-center">
          {rank <= 3 ? (
            MEDALS[rank - 1]
          ) : (
            <span className="text-gray-500 text-base">{rank}</span>
          )}
        </span>
        <span className="flex-1 font-semibold text-gray-800 dark:text-gray-100 text-sm">
          {entry.name}
        </span>
        {entry.note && (
          <span title={entry.note} className="text-sm cursor-help">
            ℹ️
          </span>
        )}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {hasLivePick && (
            <span className="flex items-center gap-1 text-xs font-bold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 px-2 py-0.5 rounded-full">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
              live
            </span>
          )}
          {aliveCount >= 0 && (
            <span className={`inline-flex items-center justify-center gap-1 text-xs font-bold rounded-full border w-[100px] py-0.5 tabular-nums ${
              aliveCount <= 3
                ? 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800'
                : aliveCount <= 6
                ? 'text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800'
                : 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800'
            }`}>
              <span>{aliveCount === 0 ? '🪦' : aliveCount <= 3 ? '🆘' : aliveCount <= 6 ? '🥵' : '⛽️'}</span>
              <span>{aliveCount}/9</span>
            </span>
          )}
          <span className="font-display text-2xl font-bold text-[#1a3a6b] dark:text-blue-300 tabular-nums">
            {displayTotal}
            <span className="text-xs text-gray-400 font-normal ml-0.5">pts</span>
          </span>
        </div>
        <span
          className={`text-gray-400 text-xs transition-transform ${open ? 'rotate-180' : ''}`}
        >
          ▼
        </span>
      </button>

      {open && (
        <div className="border-t border-gray-100 dark:border-gray-700 px-4 pb-4 pt-3">
          {entry.note && (
            <div className="mb-3 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
              ℹ️ {entry.note}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1">
                ⚽ Teams
              </h4>
              {entry.teams.map((p, i) => (
                <PickChip
                  key={i}
                  label={p.label}
                  value={pickValues.get(p.label) ?? 0}
                  live={livePickLabels.has(p.label)}
                  allFixtures={allFixtures}
                  allMatchImpacts={allMatchImpacts}
                  pickToTeam={pickToTeam}
                  pickGroupBonus={pickGroupBonus}
                  pickExcludedFixtures={pickExcludedFixtures}
                />
              ))}
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1">
                🌟 Players
              </h4>
              {entry.players.map((p, i) => (
                <PickChip
                  key={i}
                  label={p.label}
                  value={pickValues.get(p.label) ?? 0}
                  live={livePickLabels.has(p.label)}
                  allFixtures={allFixtures}
                  allMatchImpacts={allMatchImpacts}
                  pickToTeam={pickToTeam}
                  pickGroupBonus={pickGroupBonus}
                  pickExcludedFixtures={pickExcludedFixtures}
                />
              ))}
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1">
                🧤 Keepers
              </h4>
              {entry.keepers.map((p, i) => (
                <PickChip
                  key={i}
                  label={p.label}
                  value={pickValues.get(p.label) ?? 0}
                  live={livePickLabels.has(p.label)}
                  allFixtures={allFixtures}
                  allMatchImpacts={allMatchImpacts}
                  pickToTeam={pickToTeam}
                  pickGroupBonus={pickGroupBonus}
                  pickExcludedFixtures={pickExcludedFixtures}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
