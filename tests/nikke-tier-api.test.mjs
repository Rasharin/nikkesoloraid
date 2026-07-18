import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("tier migration exposes reads and restricts writes to master or submaster", () => {
  const sql = fs.readFileSync("supabase/120_nikke_tier_board.sql", "utf8");

  assert.match(sql, /for select\s+to anon, authenticated/i);
  assert.match(sql, /master_user_id\s*=\s*\(select auth\.uid\(\)\)/i);
  assert.match(sql, /2d455703-52fd-4239-82f8-79c5e1856f30/i);
  assert.match(sql, /for update[\s\S]*using[\s\S]*with check/i);
  assert.match(sql, /revoke all on public\.nikke_tier_board from anon, authenticated/i);
  assert.match(sql, /revoke delete/i);
  assert.match(sql, /nikke_tier_board_updated_by_idx/i);
});

test("tier API implements public GET and protected PATCH with conflict response", () => {
  const route = fs.readFileSync("app/api/tier-board/route.ts", "utf8");
  const server = fs.readFileSync("app/api/tier-board/tier-board-server.ts", "utf8");

  assert.match(route, /export async function GET/);
  assert.match(route, /export async function PATCH/);
  assert.match(route, /status:\s*403/);
  assert.match(route, /status:\s*409/);
  assert.match(`${route}\n${server}`, /expectedUpdatedAt/);
});

test("giseon decks and tier permissions share the submaster constant", () => {
  const source = fs.readFileSync("app/components/recommend/GiseonDeckSection.tsx", "utf8");

  assert.match(source, /import \{ SUBMASTER_USER_ID \} from "\.\.\/\.\.\/\.\.\/lib\/submaster"/);
  assert.doesNotMatch(source, /DEFAULT_SUBMASTER_USER_ID/);
});
