export type HomeAnnouncement = {
  content: string;
  version: string;
};

export function serializeHomeAnnouncement(content: string, version: string): string {
  return JSON.stringify({
    content: content.trim(),
    version: version.trim(),
  });
}

export function parseHomeAnnouncementSetting(value: string | null): HomeAnnouncement | null {
  if (!value?.trim()) return null;

  try {
    const parsed = JSON.parse(value) as Partial<HomeAnnouncement>;
    const content = typeof parsed.content === "string" ? parsed.content.trim() : "";
    const version = typeof parsed.version === "string" ? parsed.version.trim() : "";
    return content && version ? { content, version } : null;
  } catch {
    return null;
  }
}

export function isHomeAnnouncementDismissed(
  dismissedVersion: string | null,
  announcementVersion: string
): boolean {
  return dismissedVersion === announcementVersion;
}
