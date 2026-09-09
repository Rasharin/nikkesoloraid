import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../app/components/tabs/ImaginarySoloRaidTab.tsx", import.meta.url), "utf8");

test("union raid deck builder groups decks into independent column panels", () => {
  assert.match(source, /unionColumnGroups/);
  assert.match(source, /union-raid-column-section/);
  assert.match(source, /deckIndex % 3 === columnIndex/);
  assert.match(source, /columnElements/);
  assert.match(source, /activeDeckPage\.columnElements\?\.\[group\.columnIndex\]/);
  assert.match(source, /deckId: deckDrafts\[index\]\.id, element: activeDeckPage\.columnElements\?\.\[index % 3\]/);
  assert.match(source, /lg:grid-cols-3/);
  assert.match(source, /minmax\(17rem,2fr\)_minmax\(0,8fr\)/);
  assert.doesNotMatch(source, /\{rowIndex \+ 1\}행/);
  assert.doesNotMatch(source, /union-raid-row-section/);
});
