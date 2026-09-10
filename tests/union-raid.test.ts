import test from 'node:test';
import assert from 'node:assert/strict';
import { crossRowDuplicates, unionDeckStorageTarget, validateUnionSchedule, unionRaidKey } from '../lib/union-raid.ts';

test('only duplicates across logical three-deck rows are highlighted', () => {
  assert.deepEqual([...crossRowDuplicates([['A'], ['A'], [null], ['B']])], []);
  assert.deepEqual([...crossRowDuplicates([['A'], ['B'], ['C'], ['A', 'C']])].sort(), ['A', 'C']);
});
test('union keys cannot collide with solo keys generated from labels', () => {
  assert.equal(unionRaidKey(7), 'union-7');
});
test('schedule requires a positive integer round and valid ordered dates', () => {
  assert.equal(validateUnionSchedule(3, '2026-09-10T00:00:00Z', '2026-09-11T00:00:00Z'), null);
  for (const round of [0, -1, 1.5, NaN]) assert.ok(validateUnionSchedule(round, '2026-09-10', '2026-09-11'));
  assert.ok(validateUnionSchedule(1, 'bad', '2026-09-11'));
  assert.ok(validateUnionSchedule(1, '2026-09-11', '2026-09-10'));
});

test('union deck storage falls back to season off when no raid is active', () => {
  assert.equal(unionDeckStorageTarget(null), '__season_off__');
  assert.equal(unionDeckStorageTarget('union-7'), 'union-7');
});
