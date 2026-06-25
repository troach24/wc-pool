import assert from 'node:assert/strict';
import test from 'node:test';
import {
  accumulateLines,
  computeTeamPointsFromStats,
  findPlayerByCountry,
  matchWinner,
  roundResultPoints,
} from '../src/lib/pointCalc.ts';
import { matchesApiName } from '../src/lib/nameMap.ts';
import { TEAM_POINTS } from '../src/lib/scoring.ts';
import type { WCEvent } from '../src/lib/api.ts';

function event(over: Partial<WCEvent> = {}): WCEvent {
  return {
    id: 1,
    homeTeam: { name: 'Home', id: 1 },
    awayTeam: { name: 'Away', id: 2 },
    homeScore: { current: 0 },
    awayScore: { current: 0 },
    status: { description: 'FT', type: 'finished' },
    tournament: {},
    round: 'Group Stage - 1',
    startTimestamp: 0,
    ...over,
  };
}

test('matchesApiName does not confuse Raul Jiménez with Raúl Rangel', () => {
  assert.equal(matchesApiName('Raul Jimenez', 'Raúl Rangel'), false);
});

test('findPlayerByCountry prefers the same-country Jiménez over a shared-first-name teammate', () => {
  const teamOf = (name: string) => (name === 'Raúl Rangel' ? 'Mexico' : 'Mexico');
  assert.equal(
    findPlayerByCountry('🇲🇽Raul Jimeneź', ['Raúl Rangel', 'Raúl Jiménez'], teamOf),
    'Raúl Jiménez'
  );
});

test('roundResultPoints maps each round to the right win bonus', () => {
  assert.equal(roundResultPoints('Group Stage - 2').win, TEAM_POINTS.groupWin);
  assert.equal(roundResultPoints('Round of 32').win, TEAM_POINTS.r32Win);
  assert.equal(roundResultPoints('Round of 16').win, TEAM_POINTS.r16Win);
  assert.equal(roundResultPoints('Quarter-finals').win, TEAM_POINTS.qfWin);
  assert.equal(roundResultPoints('Semi-finals').win, TEAM_POINTS.sfWin);
});

test('roundResultPoints distinguishes the 3rd-place match from the final', () => {
  const third = roundResultPoints('3rd Place Final');
  assert.equal(third.win, TEAM_POINTS.thirdPlace);
  assert.equal(third.runnerUp, 0);
  const fin = roundResultPoints('Final');
  assert.equal(fin.win, TEAM_POINTS.winner);
  assert.equal(fin.runnerUp, TEAM_POINTS.runnerUp);
});

test('matchWinner resolves a penalty shootout when regulation is level', () => {
  assert.equal(matchWinner(event({ round: 'Round of 32' })), null); // 0-0, no pens
  assert.equal(
    matchWinner(
      event({
        round: 'Round of 32',
        homeScore: { current: 1 },
        awayScore: { current: 1 },
        penaltyScore: { home: 4, away: 5 },
      })
    ),
    'away'
  );
});

test('a knockout win scores the round bonus, not the group rate', () => {
  // Home win 2-1 in the Round of 32: 2 goals + r32Win, no shutout.
  const stats = accumulateLines([
    {
      event: event({ round: 'Round of 32', homeScore: { current: 2 }, awayScore: { current: 1 } }),
      lines: [],
    },
  ]);
  const home = computeTeamPointsFromStats(stats.teams.get('Home')!);
  assert.equal(home, 2 * TEAM_POINTS.goal + TEAM_POINTS.r32Win);
});

test('the final pays the winner and the runner-up', () => {
  const stats = accumulateLines([
    {
      event: event({
        round: 'Final',
        homeScore: { current: 1 },
        awayScore: { current: 1 },
        penaltyScore: { home: 3, away: 1 },
      }),
      lines: [],
    },
  ]);
  // Home win on pens: 1 goal + winner bonus (no shutout — 1 conceded).
  assert.equal(
    computeTeamPointsFromStats(stats.teams.get('Home')!),
    1 * TEAM_POINTS.goal + TEAM_POINTS.winner
  );
  // Away lose: 1 goal + runner-up bonus.
  assert.equal(
    computeTeamPointsFromStats(stats.teams.get('Away')!),
    1 * TEAM_POINTS.goal + TEAM_POINTS.runnerUp
  );
});
