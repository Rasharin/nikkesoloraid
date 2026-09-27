import test from "node:test";
import assert from "node:assert/strict";
import { COMMON, normalizeCookie } from "../cloudflare/blablalink-worker/src/index.js";

test("uses the current BlaBlaLink common parameters", () => {
  assert.equal(COMMON.game_id, "16");
  assert.equal(COMMON.data_statistics_scene, "outer");
  assert.equal(COMMON.data_statistics_page_id, "https://www.blablalink.com/");
  assert.equal(COMMON.data_statistics_client_type, "pc_web");
  assert.equal(COMMON.data_statistics_lang, "ko");
});

test("normalizes a copied cURL cookie value before sending it upstream", () => {
  assert.equal(
    normalizeCookie("-b 'game_openid=123; game_token=abc'"),
    "game_openid=123; game_token=abc",
  );
  assert.equal(
    normalizeCookie("game_openid=123;\r\ngame_token=abc"),
    "game_openid=123; game_token=abc",
  );
});
