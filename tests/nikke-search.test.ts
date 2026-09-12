import assert from "node:assert/strict";
import test from "node:test";

import {
  extractHangulInitials,
  findBestNikkeMatch,
  matchesNikkeSearch,
  normalizeNikkeName,
} from "../lib/nikke-search.ts";

const nikkes = [
  { id: "r", name: "라피: 레드 후드", aliases: ["Red Hood"] },
  { id: "m", name: "미하라: 본딩", aliases: [] },
  { id: "h", name: "홍련", aliases: [] },
];

test("normalizeNikkeName ignores spacing and separator differences", () => {
  assert.equal(normalizeNikkeName("라피: 레드 후드"), normalizeNikkeName("라피 레드후드"));
  assert.equal(normalizeNikkeName("라피-레드후드"), normalizeNikkeName("라피_레드후드"));
});

test("findBestNikkeMatch returns a registered canonical Nikke name", () => {
  assert.equal(findBestNikkeMatch("라피 레드후드", nikkes).nikke?.name, "라피: 레드 후드");
  assert.equal(findBestNikkeMatch("미하라 본딩", nikkes).nikke?.name, "미하라: 본딩");
  assert.equal(findBestNikkeMatch("Red Hood", nikkes).nikke?.name, "라피: 레드 후드");
  assert.equal(findBestNikkeMatch("라피 레드후두", nikkes).nikke?.name, "라피: 레드 후드");
});

test("findBestNikkeMatch rejects unrelated, numeric, short, and ambiguous inputs", () => {
  assert.equal(findBestNikkeMatch("abc123", nikkes).nikke, null);
  assert.equal(findBestNikkeMatch("12345", nikkes).nikke, null);
  assert.equal(findBestNikkeMatch("라", nikkes).nikke, null);
  assert.equal(findBestNikkeMatch("홍", nikkes).nikke, null);
  assert.equal(findBestNikkeMatch("라피", nikkes).nikke, null);
});

test("extractHangulInitials extracts initials while ignoring spaces and punctuation", () => {
  assert.equal(extractHangulInitials("홍련"), "ㅎㄹ");
  assert.equal(extractHangulInitials("레드 후드"), "ㄹㄷㅎㄷ");
  assert.equal(extractHangulInitials("[홍련]"), "ㅎㄹ");
});

test("matchesNikkeSearch supports Korean, initial, and alias searches", () => {
  const nikke = { name: "레드 후드", aliases: ["Red Hood"] };

  assert.equal(matchesNikkeSearch(nikke, "레드 후드"), true);
  assert.equal(matchesNikkeSearch(nikke, "드 후"), true);
  assert.equal(matchesNikkeSearch(nikke, "ㄹㄷㅎㄷ"), true);
  assert.equal(matchesNikkeSearch(nikke, "ㄷㅎ"), true);
  assert.equal(matchesNikkeSearch(nikke, "red"), true);
  assert.equal(matchesNikkeSearch(nikke, ""), true);
  assert.equal(matchesNikkeSearch(nikke, "라푼젤"), false);
});

test("matches requested full, partial, and initial-name examples", () => {
  assert.equal(matchesNikkeSearch({ name: "홍련", aliases: [] }, "홍련"), true);
  assert.equal(matchesNikkeSearch({ name: "홍련", aliases: [] }, "홍"), true);
  assert.equal(matchesNikkeSearch({ name: "홍련", aliases: [] }, "ㅎㄹ"), true);
  assert.equal(matchesNikkeSearch({ name: "라푼젤", aliases: [] }, "라푼젤"), true);
  assert.equal(matchesNikkeSearch({ name: "라푼젤", aliases: [] }, "ㄹㅍㅈ"), true);
  assert.equal(matchesNikkeSearch({ name: "도로시", aliases: [] }, "ㄷㄹㅅ"), true);
  assert.equal(matchesNikkeSearch({ name: "라자냐", aliases: [] }, "ㄹㅈ"), true);
});

test("Nikke search UI uses the shared search matcher everywhere", async () => {
  const fs = await import("node:fs/promises");
  const files = [
    "app/components/tabs/SettingsTab.tsx",
    "app/components/tabs/MyPageTab.tsx",
    "app/components/tabs/RecommendTab.tsx",
    "app/components/tabs/ImaginarySoloRaidTab.tsx",
    "app/components/tabs/tier/TierNikkeCatalog.tsx",
    "app/components/blablalink/BlaBlaLinkMappingManager.tsx",
  ];

  for (const file of files) {
    const source = await fs.readFile(file, "utf8");
    assert.match(source, /matchesNikkeSearch/);
  }
});
