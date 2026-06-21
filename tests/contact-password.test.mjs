import assert from "node:assert/strict";
import test from "node:test";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);
const { hashContactPassword, verifyContactPassword } = jiti("../lib/contact-password.ts");

test("hashContactPassword stores a salted value that verifies the original password", async () => {
  const hash = await hashContactPassword("secret-1234");

  assert.notEqual(hash, "secret-1234");
  assert.match(hash, /^scrypt\$/);
  assert.equal(await verifyContactPassword("secret-1234", hash), true);
});

test("verifyContactPassword rejects wrong or malformed passwords", async () => {
  const hash = await hashContactPassword("secret-1234");

  assert.equal(await verifyContactPassword("wrong-password", hash), false);
  assert.equal(await verifyContactPassword("", hash), false);
  assert.equal(await verifyContactPassword("secret-1234", "not-a-valid-hash"), false);
});
