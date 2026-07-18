import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

test("calculator tab and route are removed from the application", () => {
  const pageSource = readFileSync("app/page.tsx", "utf8");
  const headerSource = readFileSync("app/components/Header.tsx", "utf8");

  assert.equal(existsSync("app/calculator/page.tsx"), false);
  assert.equal(existsSync("app/components/tabs/CalculatorTab.tsx"), false);
  assert.doesNotMatch(pageSource, /CalculatorTab|calculator|shouldShowCalculator/i);
  assert.doesNotMatch(headerSource, /CalculatorIcon|calculator|shouldShowCalculator/i);
});
