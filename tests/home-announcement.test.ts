import test from "node:test";
import assert from "node:assert/strict";
import {
  isHomeAnnouncementDismissed,
  parseHomeAnnouncementSetting,
  serializeHomeAnnouncement,
} from "../lib/home-announcement.ts";

test("serializes trimmed announcement content with its version", () => {
  assert.deepEqual(
    parseHomeAnnouncementSetting(serializeHomeAnnouncement("  점검 안내  ", "version-1")),
    { content: "점검 안내", version: "version-1" }
  );
});

test("rejects empty or malformed announcement settings", () => {
  assert.equal(parseHomeAnnouncementSetting(null), null);
  assert.equal(parseHomeAnnouncementSetting(""), null);
  assert.equal(parseHomeAnnouncementSetting('{"content":"","version":"version-1"}'), null);
});

test("dismisses only the matching announcement version", () => {
  assert.equal(isHomeAnnouncementDismissed("version-1", "version-1"), true);
  assert.equal(isHomeAnnouncementDismissed("version-1", "version-2"), false);
});
