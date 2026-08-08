export const TIER_CATALOG_SETTINGS_KEY = "soloraid_tier_catalog_settings_v1";

export const TIER_CATALOG_IMAGE_SIZE_MIN = 40;
export const TIER_CATALOG_IMAGE_SIZE_MAX = 96;

export type TierCatalogSortMode = "name" | "burst";

export type TierCatalogSettings = {
  imageSize: number;
  sortMode: TierCatalogSortMode;
};

export const DEFAULT_TIER_CATALOG_SETTINGS: TierCatalogSettings = {
  imageSize: 64.4,
  sortMode: "name",
};

export function parseTierCatalogSettings(value: string | null): TierCatalogSettings | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    if (
      !Number.isFinite(parsed.imageSize) ||
      Number(parsed.imageSize) < TIER_CATALOG_IMAGE_SIZE_MIN ||
      Number(parsed.imageSize) > TIER_CATALOG_IMAGE_SIZE_MAX ||
      (parsed.sortMode !== "name" && parsed.sortMode !== "burst")
    ) {
      return null;
    }
    return {
      imageSize: Number(parsed.imageSize),
      sortMode: parsed.sortMode,
    };
  } catch {
    return null;
  }
}

type BurstNikke = {
  id: string;
  name: string;
  burst: number | null;
};

export type TierCatalogBurstGroup<T extends BurstNikke> = {
  burst: 1 | 2 | 3 | null;
  nikkes: T[];
};

export function groupNikkesByBurst<T extends BurstNikke>(nikkes: readonly T[]): TierCatalogBurstGroup<T>[] {
  const groups: TierCatalogBurstGroup<T>[] = [
    { burst: 1, nikkes: [] },
    { burst: 2, nikkes: [] },
    { burst: 3, nikkes: [] },
    { burst: null, nikkes: [] },
  ];

  for (const nikke of nikkes) {
    const groupIndex = nikke.burst === 1 || nikke.burst === 2 || nikke.burst === 3 ? nikke.burst - 1 : 3;
    groups[groupIndex].nikkes.push(nikke);
  }

  return groups.filter((group) => group.nikkes.length > 0);
}
