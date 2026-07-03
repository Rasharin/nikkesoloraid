export function createGlobalRefreshVersion(now: Date = new Date()): string {
  return now.toISOString();
}

export function shouldApplyGlobalRefreshVersion(remoteVersion: string | null | undefined, storedVersion: string): boolean {
  const nextVersion = typeof remoteVersion === "string" ? remoteVersion.trim() : "";
  if (!nextVersion) return false;
  return nextVersion !== storedVersion;
}
