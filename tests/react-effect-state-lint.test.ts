import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";

const affectedFiles = [
  "app/components/NoticeContent.tsx",
  "app/components/PrivacyContent.tsx",
  "app/components/TermsContent.tsx",
  "app/components/tabs/HomeTab.tsx",
  "app/components/tabs/ImaginarySoloRaidTab.tsx",
  "app/components/tabs/UsageTab.tsx",
];

test("affected React screens do not synchronously set state from effects", () => {
  const eslintBin = path.resolve("node_modules/eslint/bin/eslint.js");
  const result = spawnSync(process.execPath, [eslintBin, "-f", "json", ...affectedFiles], {
    encoding: "utf8",
  });
  const reports = JSON.parse(result.stdout || "[]") as Array<{
    filePath: string;
    messages: Array<{ ruleId: string | null; line: number; message: string }>;
  }>;
  const violations = reports.flatMap((report) =>
    report.messages
      .filter((message) => message.ruleId === "react-hooks/set-state-in-effect")
      .map((message) => `${path.relative(process.cwd(), report.filePath)}:${message.line} ${message.message}`)
  );

  assert.deepEqual(violations, []);
});
