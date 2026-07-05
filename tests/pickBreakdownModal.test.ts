import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PickBreakdownModal } from '../src/components/PickBreakdownModal.tsx';
import type { WCEvent } from '../src/lib/api.ts';
import type { PickImpact } from '../src/lib/pointCalc.ts';

// Regression test for the bug where a player/keeper pick's breakdown modal
// showed its NATIONAL TEAM's full scoring breakdown (goals/shutouts/win
// bonus) instead of the player's own stats. Root cause: `pickToTeam` is
// populated for every pick category (it also resolves a player's/keeper's
// nation for fixture filtering), so inferring "is this a team pick?" from
// that map alone misidentifies player/keeper picks whenever their pick
// label happens to be present there — which is always. `isTeam` must come
// from the caller as an explicit prop instead.

const fixture: WCEvent = {
  id: 1,
  homeTeam: { name: 'Narnia', id: 1 },
  awayTeam: { name: 'Oz', id: 2 },
  homeScore: { current: 3 },
  awayScore: { current: 0 },
  status: { description: 'FT', type: 'finished' },
  tournament: {},
  round: 'Group Stage - 1',
  startTimestamp: 0,
};

// Both the team pick "Narnia" and the player pick "Aslan" resolve to the
// same nation in pickToTeam — exactly the shared-map condition that caused
// the bug.
const pickToTeam = new Map([
  ['Narnia', 'Narnia'],
  ['Aslan', 'Narnia'],
]);

// Aslan personally scored 1 of Narnia's 3 goals (+5 pts), unlike Narnia's
// team breakdown, which shows all 3 goals (+3) + shutout (+3) + group win
// (+3) = +9 — a different number computed a different way.
const allMatchImpacts: { event: WCEvent; impacts: PickImpact[] }[] = [
  {
    event: fixture,
    impacts: [
      {
        label: 'Aslan',
        points: 5,
        breakdown: [{ label: '1 goal', points: 5, color: 'green' }],
      },
      { label: 'Narnia', points: 9 },
    ],
  },
];

function render(label: string, isTeam: boolean) {
  return renderToStaticMarkup(
    React.createElement(PickBreakdownModal, {
      label,
      isTeam,
      allFixtures: [fixture],
      allMatchImpacts,
      pickToTeam,
      pickGroupBonus: new Map(),
      pickExcludedFixtures: new Map(),
      onClose: () => {},
    })
  );
}

test('a player pick shows its own goal breakdown, not the team win/shutout breakdown', () => {
  const html = render('Aslan', false);
  assert.match(html, /1 goal/);
  assert.match(html, /\+5 pts/); // total: player's own points only
  assert.doesNotMatch(html, /Shutout/);
  assert.doesNotMatch(html, /Team Win/);
});

test('a team pick with the same underlying nation still shows the full team breakdown', () => {
  const html = render('Narnia', true);
  assert.match(html, /3 goals/);
  assert.match(html, /Shutout/);
  assert.match(html, /Team Win/);
  assert.match(html, /\+9 pts/); // 3 goals*1 + shutout(3) + groupWin(3) = 9
});
