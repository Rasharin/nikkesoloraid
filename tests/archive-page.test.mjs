import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import test from "node:test";

const port = 3211;
const origin = `http://127.0.0.1:${port}`;

async function waitForPage() {
  let lastError;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(origin);
      const html = await response.text();
      if (response.ok) return { headers: response.headers, html };
      lastError = new Error(`HTTP ${response.status}: ${html.slice(0, 200)}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw lastError ?? new Error("archive page did not start");
}

async function fetchPage(path) {
  const response = await fetch(`${origin}${path}`);
  assert.equal(response.status, 200);
  return response.text();
}

test("serves the signed-out read-only archive without mutation controls", { timeout: 30_000 }, async () => {
  const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1", "--port", String(port)], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-public-anon-key",
      NEXT_PUBLIC_SITE_URL: origin,
    },
    stdio: "ignore",
  });

  try {
    const { headers, html } = await waitForPage();
    assert.match(html, /읽기 전용 덱 보관소/);
    assert.match(html, /2027년 8월경/);
    assert.match(html, /Google 로그인/);
    assert.doesNotMatch(html, />전체 삭제<|>니케 관리<|>문의하기<|>저장<\/button>/);
    assert.equal(headers.get("x-content-type-options"), "nosniff");
    assert.equal(headers.get("x-frame-options"), "DENY");
    assert.equal(headers.get("referrer-policy"), "strict-origin-when-cross-origin");
    assert.match(headers.get("permissions-policy") ?? "", /camera=\(\)/);
    assert.match(headers.get("content-security-policy") ?? "", /frame-ancestors 'none'/);

    const privacy = await fetchPage("/privacy");
    const terms = await fetchPage("/terms");
    const license = await fetchPage("/license");
    assert.match(privacy, /개인정보처리방침/);
    assert.match(terms, /제1조 \(목적\)/);
    assert.match(license, /Nikkesolo License/);
    assert.doesNotMatch(privacy, /읽기 전용 덱 보관소/);
    assert.doesNotMatch(terms, /읽기 전용 덱 보관소/);
    assert.doesNotMatch(license, /읽기 전용 덱 보관소/);
  } finally {
    server.kill("SIGTERM");
    await new Promise((resolve) => server.once("exit", resolve));
  }
});
