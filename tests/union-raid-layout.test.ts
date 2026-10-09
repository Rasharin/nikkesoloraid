import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../app/components/tabs/ImaginarySoloRaidTab.tsx", import.meta.url), "utf8");

test("union raid deck builder keeps element selection on each deck", () => {
  assert.match(source, /unionColumnGroups/);
  assert.match(source, /union-raid-column-section/);
  assert.match(source, /deckIndex % 3 === columnIndex/);
  assert.match(source, /columnElements/);
  assert.match(source, /elementOptions=\{UNION_ELEMENTS\}/);
  assert.match(source, /element=\{deck\.element \?\? null\}/);
  assert.match(source, /onElementChange=\{\(element\) =>/);
  assert.match(source, /deckId: deckDrafts\[index\]\.id, element: deckDrafts\[index\]\.element \?\? null/);
  assert.match(source, /lg:grid-cols-3/);
  assert.match(source, /minmax\(17rem,2fr\)_minmax\(0,8fr\)/);
  assert.doesNotMatch(source, /\{rowIndex \+ 1\}행/);
  assert.doesNotMatch(source, /union-raid-row-section/);
});
