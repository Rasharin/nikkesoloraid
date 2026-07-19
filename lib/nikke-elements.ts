export function normalizeSecondaryElement(
  primary: string | null,
  secondary: string | null | undefined
): string | null {
  const normalized = secondary?.trim() || null;
  return normalized && normalized !== primary ? normalized : null;
}

export function matchesSelectedElements(
  nikke: { element?: string | null; element2?: string | null },
  selected: ReadonlySet<string>
): boolean {
  if (selected.size === 0) return true;
  return Boolean(
    (nikke.element && selected.has(nikke.element)) ||
      (nikke.element2 && selected.has(nikke.element2))
  );
}
