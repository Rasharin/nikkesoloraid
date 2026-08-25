export const BLABLALINK_SERVERS = [
  { key: "korea", label: "한국", areaId: 83 },
  { key: "japan", label: "일본", areaId: 81 },
  { key: "global", label: "글로벌", areaId: 84 },
  { key: "north_america", label: "북미", areaId: 82 },
  { key: "southeast_asia", label: "동남아", areaId: 85 },
] as const;

export type BlaBlaLinkServerKey = (typeof BLABLALINK_SERVERS)[number]["key"];

export function isBlaBlaLinkServerKey(value: unknown): value is BlaBlaLinkServerKey {
  return typeof value === "string" && BLABLALINK_SERVERS.some((server) => server.key === value);
}

export const BLABLALINK_AREA_ID_BY_SERVER: Readonly<Record<BlaBlaLinkServerKey, number>> =
  Object.fromEntries(BLABLALINK_SERVERS.map((server) => [server.key, server.areaId])) as Record<
    BlaBlaLinkServerKey,
    number
  >;

export function getBlaBlaLinkAreaResolutionOrder(selectedServer: BlaBlaLinkServerKey) {
  const selectedAreaId = BLABLALINK_AREA_ID_BY_SERVER[selectedServer];
  return [
    selectedAreaId,
    ...BLABLALINK_SERVERS.map((server) => server.areaId).filter((areaId) => areaId !== selectedAreaId),
  ];
}

export async function resolveBlaBlaLinkArea<T>(
  selectedServer: BlaBlaLinkServerKey,
  lookup: (areaId: number) => Promise<readonly T[]>
) {
  for (const areaId of getBlaBlaLinkAreaResolutionOrder(selectedServer)) {
    const value = await lookup(areaId);
    if (value.length > 0) return { areaId, value };
  }
  return null;
}
