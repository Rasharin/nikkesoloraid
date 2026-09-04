import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  buildBest5ChartPoints,
  mapBlaBlaLinkCharacters,
  partitionNikkesByOwnership,
} from "../lib/blablalink.ts";
import { getBlaBlaLinkAreaResolutionOrder, isBlaBlaLinkServerKey, resolveBlaBlaLinkArea } from "../lib/blablalink/constants.ts";
import { parseBlaBlaLinkProfileUrl } from "../lib/blablalink/profile-url.ts";

test("area resolver tries the selected server first and every known area once", () => {
  assert.deepEqual(getBlaBlaLinkAreaResolutionOrder("japan"), [81, 83, 84, 82, 85]);
  assert.deepEqual(getBlaBlaLinkAreaResolutionOrder("north_america"), [82, 83, 81, 84, 85]);
});

test("server validation accepts only the five configured server keys", () => {
  assert.equal(isBlaBlaLinkServerKey("korea"), true);
  assert.equal(isBlaBlaLinkServerKey("southeast_asia"), true);
  assert.equal(isBlaBlaLinkServerKey("unknown"), false);
  assert.equal(isBlaBlaLinkServerKey(null), false);
});

test("area resolver falls back sequentially and stops at the first account match", async () => {
  const attempted: number[] = [];
  const resolved = await resolveBlaBlaLinkArea("korea", async (areaId) => {
    attempted.push(areaId);
    return areaId === 84 ? ["account"] : [];
  });

  assert.deepEqual(attempted, [83, 81, 84]);
  assert.deepEqual(resolved, { areaId: 84, value: ["account"] });
});

test("profile URL parser follows Moris openidFrom and extracts the trailing numeric intl_open_id", () => {
  assert.deepEqual(
    parseBlaBlaLinkProfileUrl("https://www.blablalink.com/user?lang=ko&openid=MjkxNTctNjQzNTMwNDgwODcwMTE4Mzc4MA%3D%3D&utm_source=test"),
    { openId: "6435304808701183780" },
  );
  assert.deepEqual(
    parseBlaBlaLinkProfileUrl("https://www.blablalink.com/user?uid=29080-15361668407129878426"),
    { openId: "15361668407129878426" },
  );
  assert.deepEqual(parseBlaBlaLinkProfileUrl("15361668407129878426"), { openId: "15361668407129878426" });
  assert.deepEqual(parseBlaBlaLinkProfileUrl("29080-15361668407129878426"), { openId: "15361668407129878426" });
});

test("ShiftyPad home URL reports that a profile identifier is missing", () => {
  assert.throws(
    () => parseBlaBlaLinkProfileUrl("https://www.blablalink.com/shiftyspad/home?lang=ko"),
    /홈 주소에는 계정 정보가 없습니다.*UID/,
  );
});

test("profile URL parser rejects invalid URLs, other domains, and unsupported BlaBlaLink links", () => {
  for (const value of [
    "",
    "not-a-url",
    "https://example.com/shiftyspad/nikke/80?openid=MjkxNTctNjQzNTMwNDgwODcwMTE4Mzc4MA%3D%3D",
  ]) assert.throws(() => parseBlaBlaLinkProfileUrl(value), /올바른 블라블라링크 프로필 링크/);
});

test("profile URL parser rejects malformed identifiers without a numeric account id", () => {
  for (const openid of ["%%%", Buffer.from("bad;cookie=1").toString("base64"), Buffer.from("한글").toString("base64")]) {
    assert.throws(
      () => parseBlaBlaLinkProfileUrl(`https://www.blablalink.com/shiftyspad/nikke/80?openid=${encodeURIComponent(openid)}`),
      /올바른 블라블라링크 프로필 링크/,
    );
  }
});

test("BlaBlaLink modal and browser payload expose only server and profileUrl", () => {
  const component = readFileSync(new URL("../app/components/blablalink/BlaBlaLinkButton.tsx", import.meta.url), "utf8");
  const route = readFileSync(new URL("../app/api/blablalink/route.ts", import.meta.url), "utf8");
  assert.match(component, /font-medium">내 프로필 링크/);
  assert.doesNotMatch(component, /내 프로필 링크 또는 UID/);
  assert.match(component, /내 프로필 입력 링크의 BlaBlalink 주소를 입력 해주세요/);
  assert.match(component, /<strong[^>]*>프로필과 니케 목록은 공개<\/strong>/);
  assert.match(component, /연동까지 다소 시간이 걸릴 수 있습니다\./);
  assert.match(component, /deckToolbar\?: boolean/);
  assert.match(component, /BlaBlalink 동기화/);
  assert.match(component, /\/blablalink-icon\.png/);
  assert.match(component, /JSON\.stringify\(\{ server, profileUrl \}\)/);
  assert.doesNotMatch(component, /gameOpenId|gameToken|game_openid|game_token/);
  assert.match(route, /profileUrl/);
  assert.doesNotMatch(route, /body\.gameOpenId|body\.gameToken/);

  const deckBuilding = readFileSync(new URL("../app/components/tabs/ImaginarySoloRaidTab.tsx", import.meta.url), "utf8");
  assert.match(deckBuilding, /deckToolbar/);
});

test("deck building keeps the Nikke management selection and catalog independent from BlaBlaLink ownership", () => {
  const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
  const selectedNikkesBlock = page.slice(page.indexOf("const selectednikkes"), page.indexOf("const soloRaidInProgress"));
  const deckBuildingProps = page.slice(page.indexOf("<ImaginarySoloRaidTab"), page.indexOf("</ImaginarySoloRaidTab>"));

  assert.doesNotMatch(selectedNikkesBlock, /ownedNikkeIdSet/);
  assert.match(deckBuildingProps, /selectedNikkes=\{selectednikkes\}[\s\S]*nikkes=\{nikkes\}/);
  assert.doesNotMatch(deckBuildingProps, /integrationNikkes|unownedNikkes/);
});

test("deck building Nikke picker keeps its original section overlay and does not split unowned Nikkes", () => {
  const deckBuilding = readFileSync(new URL("../app/components/tabs/ImaginarySoloRaidTab.tsx", import.meta.url), "utf8");

  assert.match(deckBuilding, /className="absolute inset-2 z-30 flex flex-col/);
  assert.doesNotMatch(deckBuilding, /unownedNikkes|미보유 니케/);
});

test("BlaBlaLink mapping manager supports a two-column grid and bulk verification", () => {
  const component = readFileSync(new URL("../app/components/blablalink/BlaBlaLinkMappingManager.tsx", import.meta.url), "utf8");
  const route = readFileSync(new URL("../app/api/admin/blablalink-mappings/route.ts", import.meta.url), "utf8");

  assert.match(component, /lg:grid-cols-2/);
  assert.match(component, /일괄 매칭 확인/);
  assert.match(component, /action: "verify-all"/);
  assert.match(route, /action: "verify-all"/);
  assert.doesNotMatch(route, /verify-all[\s\S]*?mapping_source", "auto"[\s\S]*?return NextResponse\.json\(\{ ok: true, verified/);
  assert.match(route, /mapping_verified", false/);
  assert.match(route, /resource_id", "is", null/);
});

test("recommend tab keeps only the side synchro chart with the concise title", () => {
  const recommend = readFileSync(new URL("../app/components/tabs/RecommendTab.tsx", import.meta.url), "utf8");
  const chart = readFileSync(new URL("../app/components/blablalink/Best5SynchroChart.tsx", import.meta.url), "utf8");

  assert.equal((recommend.match(/<Best5SynchroChart/g) ?? []).length, 1);
  assert.match(recommend, /Best5SynchroChart[^\n]*compact/);
  assert.match(chart, /싱크로별 합계 딜량/);
  assert.doesNotMatch(chart, /싱크로 레벨별 Best 5덱 합계 딜량/);
  assert.match(chart, /const Y_TICK_STEP = 10_000_000_000/);
  assert.match(chart, /const Y_MINOR_TICK_STEP = 5_000_000_000/);
  assert.match(chart, /100억/);
  assert.match(chart, /yTicks\.map/);
  assert.match(chart, /strokeDasharray=\{majorTick \? "10 6" : "3 5"\}/);
  assert.match(chart, /height = compact \? 270 : 320/);
  assert.match(chart, /padding = 62/);
  assert.match(chart, /text-\[15px\]/);
});

test("mapBlaBlaLinkCharacters keeps mapped characters and reports unmapped name codes", () => {
  const result = mapBlaBlaLinkCharacters(
    [
      { name_code: 101, lv: 400, grade: 3, core: 1 },
      { name_code: 999, lv: 1, grade: 0, core: 0 },
    ],
    new Map([[101, 10]]),
    new Map([[10, "nikke-rapi"]])
  );

  assert.deepEqual(result.characters, [
    { nikkeId: "nikke-rapi", nameCode: 101, resourceId: 10, level: 400, breakthrough: 3, core: 1 },
  ]);
  assert.deepEqual(result.unmappedNameCodes, [999]);
});

test("partitionNikkesByOwnership preserves the full legacy list when integration is absent", () => {
  const nikkes = [{ id: "a" }, { id: "b" }, { id: "c" }];
  assert.deepEqual(partitionNikkesByOwnership(nikkes, null), { owned: nikkes, unowned: [] });
  assert.deepEqual(partitionNikkesByOwnership(nikkes, new Set(["b"])), {
    owned: [{ id: "b" }],
    unowned: [{ id: "a" }, { id: "c" }],
  });
});

test("buildBest5ChartPoints groups synchro levels into 50-level ranges and keeps each range's best total", () => {
  assert.deepEqual(
    buildBest5ChartPoints([
      { synchroLevel: 100, total: 500 },
      { synchroLevel: 150, total: 700 },
      { synchroLevel: 151, total: 600 },
      { synchroLevel: 199, total: 900 },
      { synchroLevel: 200, total: 800 },
      { synchroLevel: 201, total: 1000 },
      { synchroLevel: 400, total: 0 },
    ]),
    [
      { rangeStart: 100, rangeEnd: 150, total: 700 },
      { rangeStart: 151, rangeEnd: 200, total: 900 },
      { rangeStart: 201, rangeEnd: 250, total: 1000 },
    ]
  );
});

test("buildBest5ChartPoints omits ranges without stored data", () => {
  assert.deepEqual(
    buildBest5ChartPoints([
      { synchroLevel: 150, total: 700 },
      { synchroLevel: 201, total: 1000 },
    ]),
    [
      { rangeStart: 100, rangeEnd: 150, total: 700 },
      { rangeStart: 201, rangeEnd: 250, total: 1000 },
    ]
  );
});
