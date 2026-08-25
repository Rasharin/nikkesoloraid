export type BlaBlaLinkMappingSource = "auto" | "manual";
export type BlaBlaLinkMappingStatus = "matched" | "unmatched" | "duplicate" | "review" | "manual";

export type BlaBlaLinkMappingCandidate = {
  name: string;
  normalizedName: string;
  resourceId: number;
  nameCode: number | null;
};

export type BlaBlaLinkMappingRow = {
  id: string;
  name: string;
  resourceId: number | null;
  nameCode: number | null;
  mappingSource: BlaBlaLinkMappingSource | null;
  mappingVerified: boolean;
};

export function normalizeBlaBlaLinkCharacterName(value: string) {
  return value.normalize("NFKC").toLocaleLowerCase("ko-KR").replace(/[\s·:：_\-()[\]{}'"!.]/g, "");
}

export function buildBlaBlaLinkMappingCandidates(
  scraped: Record<string, { id?: number; name?: string }>,
  idRows: readonly { name_code: number; resource_id: number }[],
): BlaBlaLinkMappingCandidate[] {
  const firstNameCodeByResourceId = new Map<number, number>();
  for (const row of idRows) {
    const resourceId = Number(row.resource_id);
    const nameCode = Number(row.name_code);
    if (Number.isInteger(resourceId) && Number.isInteger(nameCode) && !firstNameCodeByResourceId.has(resourceId)) {
      firstNameCodeByResourceId.set(resourceId, nameCode);
    }
  }

  return Object.entries(scraped).flatMap(([key, value]) => {
    const resourceId = Number(value.id);
    if (!Number.isInteger(resourceId)) return [];
    const name = typeof value.name === "string" && value.name.trim() ? value.name.trim() : key.trim();
    return [{
      name,
      normalizedName: normalizeBlaBlaLinkCharacterName(name),
      resourceId,
      nameCode: firstNameCodeByResourceId.get(resourceId) ?? null,
    }];
  });
}

export function planAutomaticBlaBlaLinkMappings(
  rows: readonly BlaBlaLinkMappingRow[],
  candidates: readonly BlaBlaLinkMappingCandidate[],
) {
  const candidatesByName = new Map<string, BlaBlaLinkMappingCandidate[]>();
  for (const candidate of candidates) {
    const current = candidatesByName.get(candidate.normalizedName) ?? [];
    current.push(candidate);
    candidatesByName.set(candidate.normalizedName, current);
  }

  const updates: Array<{
    id: string;
    resourceId: number;
    nameCode: number | null;
    mappingSource: "auto";
    mappingVerified: false;
  }> = [];
  const ambiguousIds: string[] = [];
  const unmatchedIds: string[] = [];

  for (const row of rows) {
    if (row.mappingSource === "manual" || row.mappingVerified) continue;
    const matches = candidatesByName.get(normalizeBlaBlaLinkCharacterName(row.name)) ?? [];
    const distinct = [...new Map(matches.map((candidate) => [candidate.resourceId, candidate])).values()];
    if (distinct.length === 0) unmatchedIds.push(row.id);
    else if (distinct.length > 1) ambiguousIds.push(row.id);
    else {
      const candidate = distinct[0];
      updates.push({
        id: row.id,
        resourceId: candidate.resourceId,
        nameCode: candidate.nameCode,
        mappingSource: "auto",
        mappingVerified: false,
      });
    }
  }
  return { updates, ambiguousIds, unmatchedIds };
}

export function findDuplicateResourceIds(rows: readonly { resourceId: number | null }[]) {
  const counts = new Map<number, number>();
  for (const row of rows) {
    if (row.resourceId !== null) counts.set(row.resourceId, (counts.get(row.resourceId) ?? 0) + 1);
  }
  return new Set([...counts].filter(([, count]) => count > 1).map(([resourceId]) => resourceId));
}

export function getBlaBlaLinkMappingStatus(
  row: Pick<BlaBlaLinkMappingRow, "resourceId" | "mappingSource" | "mappingVerified">,
  duplicateResourceIds: ReadonlySet<number>,
): BlaBlaLinkMappingStatus {
  if (row.resourceId === null) return "unmatched";
  if (duplicateResourceIds.has(row.resourceId)) return "duplicate";
  if (row.mappingSource === "manual") return "manual";
  if (!row.mappingVerified) return "review";
  return "matched";
}
