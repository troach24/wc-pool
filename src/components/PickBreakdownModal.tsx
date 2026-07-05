import { matchWinner, roundResultPoints } from '../lib/pointCalc';
import { TEAM_POINTS } from '../lib/scoring';
import type { WCEvent } from '../lib/api';
import type { PickImpact, BreakdownItem } from '../lib/pointCalc';

type MatchImpact = { event: WCEvent; impacts: PickImpact[] };

type SubItem = { label: string; points: number; color: string };

const BADGE: Record<string, string> = {
  green:  'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300',
  teal:   'bg-teal-50 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300',
  cyan:   'bg-cyan-50 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300',
  sky:    'bg-sky-50 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300',
  blue:   'bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
  purple: 'bg-purple-50 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300',
  amber:  'bg-amber-50 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
  red:    'bg-red-50 dark:bg-red-900/40 text-red-700 dark:text-red-300',
};

const TEXT: Record<string, string> = {
  green:  'text-emerald-700 dark:text-emerald-300',
  teal:   'text-teal-700 dark:text-teal-300',
  cyan:   'text-cyan-700 dark:text-cyan-300',
  sky:    'text-sky-700 dark:text-sky-300',
  blue:   'text-blue-700 dark:text-blue-300',
  purple: 'text-purple-700 dark:text-purple-300',
  amber:  'text-amber-700 dark:text-amber-300',
  red:    'text-red-700 dark:text-red-300',
};

function roundWinLabel(round: string): string {
  const r = round.toLowerCase();
  if (r.includes('group'))                           return 'Team Win';
  if (r.includes('round of 32'))                    return 'RD of 32 Win';
  if (r.includes('round of 16'))                    return 'RD of 16 Win';
  if (r.includes('quarter'))                         return 'Quarterfinal Win';
  if (r.includes('semi'))                            return 'Semifinal Win';
  if (r.includes('3rd place') || r.includes('third place')) return '3rd Place Win';
  if (r.includes('final'))                           return '1st Place';
  return 'Win';
}

function teamBreakdown(f: WCEvent, teamName: string): SubItem[] {
  const isHome = f.homeTeam.name === teamName;
  const myGoals  = isHome ? f.homeScore.current : f.awayScore.current;
  const oppGoals = isHome ? f.awayScore.current : f.homeScore.current;
  const winner   = matchWinner(f);
  const iWon     = (winner === 'home' && isHome) || (winner === 'away' && !isHome);
  const rp       = roundResultPoints(f.round);
  const isRunnerUp = !iWon && rp.runnerUp > 0;

  const items: SubItem[] = [];
  if (myGoals > 0)   items.push({ label: `${myGoals} goal${myGoals !== 1 ? 's' : ''}`, points: myGoals * TEAM_POINTS.goal, color: 'green' });
  if (oppGoals === 0) items.push({ label: 'Shutout', points: TEAM_POINTS.shutout, color: 'teal' });
  if (iWon)          items.push({ label: roundWinLabel(f.round), points: rp.win, color: 'blue' });
  if (isRunnerUp)    items.push({ label: '2nd Place', points: rp.runnerUp, color: 'purple' });
  return items;
}

const GROUP_BONUS_LABELS: Record<number, string> = {
  8: 'Win Group',
  4: '2nd in Group',
  2: '3rd & Qualified',
};

export function PickBreakdownModal({
  label,
  isTeam,
  allFixtures,
  allMatchImpacts,
  pickToTeam,
  pickGroupBonus,
  pickExcludedFixtures,
  onClose,
}: {
  label: string;
  // Which pick category this is — must come from the caller (which knows
  // whether the pick was made from the teams/players/keepers list), NOT
  // inferred from pickToTeam: that map also resolves a player's/keeper's
  // national team (for fixture filtering), so a player pick always has an
  // entry there too and would be misidentified as a team pick.
  isTeam: boolean;
  allFixtures: WCEvent[];
  allMatchImpacts: MatchImpact[];
  pickToTeam: Map<string, string>;
  pickGroupBonus: Map<string, number>;
  pickExcludedFixtures: Map<string, number[]>;
  onClose: () => void;
}) {
  const teamName   = pickToTeam.get(label);
  const groupBonus = pickGroupBonus.get(label) ?? 0;
  const excluded   = new Set(pickExcludedFixtures.get(label) ?? []);

  const pointsByFixture = new Map<number, number>();
  for (const mi of allMatchImpacts) {
    const pts = excluded.has(mi.event.id) ? 0 : (mi.impacts.find((i) => i.label === label)?.points ?? 0);
    pointsByFixture.set(mi.event.id, pts);
  }

  const breakdownByFixture = new Map<number, BreakdownItem[]>();
  for (const mi of allMatchImpacts) {
    const imp = mi.impacts.find((i) => i.label === label);
    if (imp?.breakdown) breakdownByFixture.set(mi.event.id, imp.breakdown);
  }

  const rows = allFixtures
    .filter((f) => {
      if (f.status.type !== 'finished' && f.status.type !== 'inprogress') return false;
      if (isTeam) return f.homeTeam.name === teamName || f.awayTeam.name === teamName;
      return (pointsByFixture.get(f.id) ?? 0) > 0;
    })
    .map((f) => ({ event: f, points: pointsByFixture.get(f.id) ?? 0 }));

  const matchTotal = rows.reduce((s, r) => s + r.points, 0);
  const total = matchTotal + groupBonus;

  const fmtDate = (ts: number) =>
    new Date(ts * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
          <div>
            <div className="font-semibold text-gray-900 dark:text-gray-100">{label}</div>
            <div className="text-xs text-gray-400">scoring breakdown</div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none">×</button>
        </div>

        <div className="px-4 py-3 max-h-96 overflow-y-auto">
          {rows.length === 0 && groupBonus === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No finished games yet</p>
          ) : (
            <div className="flex flex-col gap-0.5">
              {rows.map((r, i) => {
                const teamItems = isTeam ? teamBreakdown(r.event, teamName!) : null;
                const nonTeamItems: BreakdownItem[] | null = !isTeam ? (breakdownByFixture.get(r.event.id) ?? null) : null;
                const hasPoints = r.points > 0;

                return (
                  <div key={i} className="py-1.5 border-b border-gray-50 dark:border-gray-700 last:border-0">
                    {/* Match header */}
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-gray-400 dark:text-gray-500 min-w-[44px]">{fmtDate(r.event.startTimestamp)}</span>
                      <span className="flex-1 text-xs text-gray-600 dark:text-gray-400 text-center">
                        {r.event.homeTeam.name} {r.event.homeScore.current}–{r.event.awayScore.current} {r.event.awayTeam.name}
                      </span>
                      {!isTeam && !nonTeamItems && (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full min-w-[36px] text-center ${hasPoints ? BADGE.blue : 'bg-gray-100 dark:bg-gray-700 text-gray-400'}`}>
                          +{r.points}
                        </span>
                      )}
                    </div>

                    {/* Per-item breakdown for teams */}
                    {teamItems && teamItems.length > 0 && (
                      <div className="flex flex-col gap-0.5 pl-[52px]">
                        {teamItems.map((item, j) => (
                          <div key={j} className="flex items-center justify-between gap-2">
                            <span className={`text-xs ${TEXT[item.color]}`}>{item.label}</span>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full min-w-[36px] text-center ${BADGE[item.color]}`}>
                              +{item.points}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Per-item breakdown for players/keepers */}
                    {nonTeamItems && nonTeamItems.length > 0 && (
                      <div className="flex flex-col gap-0.5 pl-[52px]">
                        {nonTeamItems.map((item, j) => (
                          <div key={j} className="flex items-center justify-between gap-2">
                            <span className={`text-xs ${TEXT[item.color]}`}>{item.label}</span>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full min-w-[36px] text-center ${BADGE[item.color]}`}>
                              +{item.points}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {groupBonus > 0 && (
                <div className="flex items-center justify-between gap-2 py-1.5 mt-0.5 border-t border-amber-100 dark:border-amber-900/40">
                  <span className={`text-xs font-medium ${TEXT.amber}`}>
                    {GROUP_BONUS_LABELS[groupBonus] ?? 'Group bonus'}
                  </span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full min-w-[36px] text-center ${BADGE.amber}`}>
                    +{groupBonus}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
          <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">Total</span>
          <span className="text-sm font-bold text-[#1a3a6b] dark:text-blue-300">+{total} pts</span>
        </div>
      </div>
    </div>
  );
}
