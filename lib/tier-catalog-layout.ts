export const TIER_CATALOG_LAYOUT_KEY = "soloraid_tier_catalog_layout_v1";

export type TierCatalogLayoutMode = "bottom" | "side";

export function parseTierCatalogLayoutMode(value: string | null): TierCatalogLayoutMode {
  return value === "side" ? "side" : "bottom";
}
