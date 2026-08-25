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
  assert.match(component, /JSON\.stringify\(\{ server, profileUrl \}\)/);
  assert.doesNotMatch(component, /gameOpenId|gameToken|game_openid|game_token/);
  assert.match(route, /profileUrl/);
  assert.doesNotMatch(route, /body\.gameOpenId|body\.gameToken/);
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

test("buildBest5ChartPoints keeps only real positive stored totals and chooses the best total per level", () => {
  assert.deepEqual(
    buildBest5ChartPoints([
      { synchroLevel: 350, total: 1000 },
      { synchroLevel: 300, total: 700 },
      { synchroLevel: 350, total: 1200 },
      { synchroLevel: 400, total: 0 },
    ]),
    [
      { synchroLevel: 300, total: 700 },
      { synchroLevel: 350, total: 1200 },
    ]
  );
});
