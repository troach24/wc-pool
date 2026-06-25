import assert from 'node:assert/strict';
import test from 'node:test';
import { findPlayerByCountry } from '../src/lib/pointCalc.ts';
import { matchesApiName } from '../src/lib/nameMap.ts';

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
