import type { BlaBlaLinkServerKey } from "./blablalink/constants";

export type { BlaBlaLinkServerKey } from "./blablalink/constants";

export type BlaBlaLinkIntegration = {
  connected: boolean;
  server: BlaBlaLinkServerKey | null;
  synchroLevel: number | null;
  syncedAt: string | null;
  ownedNikkeIds: string[];
};

export type BlaBlaLinkCharacterSource = {
  name_code: number;
  lv?: number;
  grade?: number;
  core?: number;
};

export function isBlaBlaLinkPrivacyCode(code: number | null | undefined) {
  return code === 1301002 || code === 1303002;
}

export type MappedBlaBlaLinkCharacter = {
  nikkeId: string;
  nameCode: number;
  resourceId: number;
  level: number | null;
  breakthrough: number | null;
  core: number | null;
};

export function mapBlaBlaLinkCharacters(
  characters: readonly BlaBlaLinkCharacterSource[],
  resourceIdByNameCode: ReadonlyMap<number, number>,
  nikkeIdByResourceId: ReadonlyMap<number, string>
) {
  const mapped: MappedBlaBlaLinkCharacter[] = [];
  const unmappedNameCodes: number[] = [];

  for (const character of characters) {
    const resourceId = resourceIdByNameCode.get(character.name_code);
    const nikkeId = resourceId === undefined ? undefined : nikkeIdByResourceId.get(resourceId);
    if (resourceId === undefined || !nikkeId) {
      unmappedNameCodes.push(character.name_code);
      continue;
    }
    mapped.push({
      nikkeId,
      nameCode: character.name_code,
      resourceId,
      level: Number.isFinite(character.lv) ? character.lv! : null,
      breakthrough: Number.isFinite(character.grade) ? character.grade! : null,
      core: Number.isFinite(character.core) ? character.core! : null,
    });
  }

  return { characters: mapped, unmappedNameCodes };
}

export function partitionNikkesByOwnership<T extends { id: string }>(
  nikkes: readonly T[],
  ownedNikkeIds: ReadonlySet<string> | null
) {
  if (ownedNikkeIds === null) return { owned: [...nikkes], unowned: [] as T[] };
  return {
    owned: nikkes.filter((nikke) => ownedNikkeIds.has(nikke.id)),
    unowned: nikkes.filter((nikke) => !ownedNikkeIds.has(nikke.id)),
  };
}

export type Best5ChartPoint = { synchroLevel: number; total: number };
export type Best5ChartRangePoint = { rangeStart: number; rangeEnd: number; total: number };

function getSynchroLevelRange(synchroLevel: number) {
  if (synchroLevel < 100) {
    const rangeStart = Math.floor((synchroLevel - 1) / 50) * 50 + 1;
    return { rangeStart, rangeEnd: Math.min(rangeStart + 49, 99) };
  }
  if (synchroLevel <= 150) return { rangeStart: 100, rangeEnd: 150 };
  const rangeStart = Math.floor((synchroLevel - 151) / 50) * 50 + 151;
  return { rangeStart, rangeEnd: rangeStart + 49 };
}

export function buildBest5ChartPoints(rows: readonly Best5ChartPoint[]): Best5ChartRangePoint[] {
  const bestByRange = new Map<number, Best5ChartRangePoint>();
  for (const row of rows) {
    if (!Number.isInteger(row.synchroLevel) || row.synchroLevel <= 0 || !Number.isFinite(row.total) || row.total <= 0) continue;
    const range = getSynchroLevelRange(row.synchroLevel);
    const previous = bestByRange.get(range.rangeStart);
    if (!previous || row.total > previous.total) bestByRange.set(range.rangeStart, { ...range, total: row.total });
  }
  return [...bestByRange.values()].sort((left, right) => left.rangeStart - right.rangeStart);
}
