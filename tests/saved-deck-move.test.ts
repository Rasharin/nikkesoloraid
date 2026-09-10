import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('saved deck cards expose a move action and target selector', () => {
  const source = readFileSync(new URL('../app/components/tabs/SavedTab.tsx', import.meta.url), 'utf8');
  assert.match(source, /이동/);
  assert.match(source, /onMoveDeck/);
  assert.match(source, /이동할 레이드/);
});

test('saved deck actions place move between score editing and copying', () => {
  const source = readFileSync(new URL('../app/components/tabs/SavedTab.tsx', import.meta.url), 'utf8');
  const scoreButton = source.indexOf('점수 수정');
  const moveButton = source.indexOf('\n                    이동');
  const copyButton = source.indexOf('복사');
  assert.ok(scoreButton >= 0 && moveButton >= 0 && copyButton >= 0);
  assert.ok(scoreButton < moveButton);
  assert.ok(moveButton < copyButton);
});

test('union deck hook supports moving preserved union layout records', () => {
  const source = readFileSync(new URL('../app/hooks/useUnionRaid.ts', import.meta.url), 'utf8');
  assert.match(source, /async function move/);
  assert.match(source, /page_id/);
  assert.match(source, /row_index/);
  assert.match(source, /deck_id/);
});
