"use client";

import Image from "next/image";
import { useDraggable } from "@dnd-kit/core";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { CSS } from "@dnd-kit/utilities";
import { formatNikkeDisplayName } from "../../../../lib/nikke-display";
import { matchesSelectedElements } from "../../../../lib/nikke-elements";
import { matchesNikkeSearch } from "../../../../lib/nikke-search";
import type { TierCatalogLayoutMode } from "../../../../lib/tier-catalog-layout";
import {
  DEFAULT_TIER_CATALOG_SETTINGS,
  TIER_CATALOG_IMAGE_SIZE_MAX,
  TIER_CATALOG_IMAGE_SIZE_MIN,
  TIER_CATALOG_SETTINGS_KEY,
  getTierCatalogGridStyle,
  groupNikkesByBurst,
  parseTierCatalogSettings,
  type TierCatalogSettings,
} from "../../../../lib/tier-catalog-settings";

export type TierNikkeRow = {
  id: string;
  name: string;
  image_path: string | null;
  burst: number | null;
  element: string | null;
  element2: string | null;
  role: string | null;
  aliases: string[];
};

export type TierFilterOption = {
  readonly v: string;
  readonly label: string;
};

type TierNikkeCatalogProps = {
  nikkes: TierNikkeRow[];
  assignedTiers: ReadonlyMap<string, string>;
  canEdit: boolean;
  getPublicUrl: (bucket: "nikke-images" | "boss-images", path: string) => string;
  bursts: readonly { readonly n: number; readonly label: string }[];
  elements: readonly TierFilterOption[];
  roles: readonly TierFilterOption[];
  layoutMode: TierCatalogLayoutMode;
  onImageClick: (nikkeName: string) => void;
};

function toggleValue<T>(set: Set<T>, value: T) {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

function CatalogCard({
  nikke,
  assigned,
  canEdit,
  getPublicUrl,
  onImageClick,
}: {
  nikke: TierNikkeRow;
  assigned: boolean;
  canEdit: boolean;
  getPublicUrl: TierNikkeCatalogProps["getPublicUrl"];
  onImageClick: TierNikkeCatalogProps["onImageClick"];
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `tier-catalog-${nikke.id}`,
    disabled: !canEdit,
    data: { source: "catalog", nikkeName: nikke.name },
  });
  const style: CSSProperties = {
    transform: isDragging ? undefined : CSS.Translate.toString(transform),
    transition: isDragging ? "none" : undefined,
    visibility: isDragging ? "hidden" : undefined,
  };
  const imageUrl = nikke.image_path ? getPublicUrl("nikke-images", nikke.image_path) : "";

  return (
    <button
      ref={setNodeRef}
      type="button"
      style={style}
      disabled={!canEdit}
      {...(canEdit ? attributes : {})}
      {...(canEdit ? listeners : {})}
      className={`group relative min-w-0 overflow-hidden rounded-xl border bg-[var(--card)] text-left ${
        canEdit ? "cursor-grab border-[var(--border)] active:cursor-grabbing" : "cursor-default border-[var(--border)]"
      }`}
    >
      <div
        data-tier-catalog-image
        onClick={() => {
          if (canEdit) onImageClick(nikke.name);
        }}
        className="relative aspect-square w-full bg-[var(--theme-panel)]"
      >
        {imageUrl ? (
          <Image
            fill
            src={imageUrl}
            alt={formatNikkeDisplayName(nikke.name)}
            draggable={false}
            className={`pointer-events-none object-cover ${assigned ? "grayscale" : ""}`}
            sizes="(max-width: 640px) 20vw, 88px"
          />
        ) : (
          <div className="grid h-full place-items-center text-[10px] text-[var(--muted)]">no image</div>
        )}
        {assigned ? (
          <span className="pointer-events-none absolute inset-0 bg-neutral-500/35" aria-hidden="true" />
        ) : null}
      </div>
      <div className="tier-catalog-card-name truncate px-1.5 py-[5px] text-center text-[13px] text-[var(--theme-text-soft)]">
        {formatNikkeDisplayName(nikke.name)}
      </div>
    </button>
  );
}

export default function TierNikkeCatalog({
  nikkes,
  assignedTiers,
  canEdit,
  getPublicUrl,
  bursts,
  elements,
  roles,
  layoutMode,
  onImageClick,
}: TierNikkeCatalogProps) {
  const [search, setSearch] = useState("");
  const [catalogCollapsed, setCatalogCollapsed] = useState(false);
  const [catalogSettingsOpen, setCatalogSettingsOpen] = useState(false);
  const [catalogSettings, setCatalogSettings] = useState<TierCatalogSettings>(() => readCatalogSettings());
  const [catalogGridWidth, setCatalogGridWidth] = useState(0);
  const catalogGridRef = useRef<HTMLDivElement | null>(null);
  const [selectedBursts, setSelectedBursts] = useState<Set<number>>(new Set());
  const [selectedElements, setSelectedElements] = useState<Set<string>>(new Set());
  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(new Set());
  const sideMode = layoutMode === "side";

  const filteredNikkes = useMemo(() => {
    const query = search.trim().toLowerCase();
    return nikkes.filter((nikke) => {
      if (
        query &&
        !matchesNikkeSearch(nikke, query)
      ) {
        return false;
      }
      if (selectedBursts.size > 0) {
        const burst = nikke.burst ?? -1;
        if (!(burst === 0 || selectedBursts.has(burst))) return false;
      }
      if (!matchesSelectedElements(nikke, selectedElements)) {
        return false;
      }
      if (selectedRoles.size > 0 && (!nikke.role || !selectedRoles.has(nikke.role))) {
        return false;
      }
      return true;
    });
  }, [nikkes, search, selectedBursts, selectedElements, selectedRoles]);

  const burstGroups = useMemo(
    () => (catalogSettings.sortMode === "burst" ? groupNikkesByBurst(filteredNikkes) : []),
    [catalogSettings.sortMode, filteredNikkes]
  );

  useEffect(() => {
    if (catalogCollapsed) return;
    const grid = catalogGridRef.current;
    if (!grid) return;
    const observer = new ResizeObserver(([entry]) => setCatalogGridWidth(entry.contentRect.width));
    observer.observe(grid);
    return () => observer.disconnect();
  }, [catalogCollapsed, sideMode]);

  const updateCatalogSettings = (next: TierCatalogSettings) => {
    setCatalogSettings(next);
    try {
      window.localStorage.setItem(TIER_CATALOG_SETTINGS_KEY, JSON.stringify(next));
    } catch { }
  };

  const filterButtonClass = (active: boolean) =>
    `shrink-0 rounded-lg border transition ${layoutMode === "side" ? "px-2 py-1 text-[11px]" : "px-2.5 py-1 text-xs"} ${
      active
        ? "border-cyan-500/40 bg-cyan-500/10 text-[var(--text)]"
        : "border-[var(--border)] text-[var(--theme-text-soft)] hover:border-neutral-400"
    }`;

  const catalogGridStyle = useMemo<CSSProperties>(
    () => getTierCatalogGridStyle(catalogGridWidth, catalogSettings.imageSize, sideMode),
    [catalogGridWidth, catalogSettings.imageSize, sideMode]
  );

  const settingsButton = (
    <button
      data-tier-catalog-settings-button
      type="button"
      onClick={() => setCatalogSettingsOpen((open) => !open)}
      aria-expanded={catalogSettingsOpen}
      aria-label="전체 니케 목록 설정"
      title="전체 니케 목록 설정"
      className={`grid shrink-0 place-items-center rounded-xl border transition hover:border-cyan-400 hover:text-[var(--text)] ${
        sideMode ? "h-8 w-8" : "h-10 w-10"
      } ${catalogSettingsOpen ? "border-cyan-500/40 bg-cyan-500/10" : "border-[var(--border)] bg-[var(--card)]"}`}
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
        <path
          d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm7.4-3.5a7.8 7.8 0 0 0-.08-1.08l2.05-1.6-2-3.46-2.52 1a8.2 8.2 0 0 0-1.86-1.08L14.6 3h-4l-.4 2.78a8.2 8.2 0 0 0-1.86 1.08l-2.52-1-2 3.46 2.05 1.6A7.8 7.8 0 0 0 5.8 12c0 .37.03.73.08 1.08l-2.05 1.6 2 3.46 2.52-1a8.2 8.2 0 0 0 1.86 1.08L10.6 21h4l.4-2.78a8.2 8.2 0 0 0 1.86-1.08l2.52 1 2-3.46-2.05-1.6c.05-.35.08-.71.08-1.08Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );

  return (
    <section
      data-tier-catalog-layout={layoutMode}
      data-tier-catalog-collapsed={catalogCollapsed}
      className={`tier-catalog-container rounded-3xl border border-[var(--border)] bg-[var(--theme-panel)] shadow-[0_16px_40px_rgba(0,0,0,0.18)] transition-[width,padding] ${
        sideMode
          ? catalogCollapsed
            ? "h-full w-14 overflow-hidden p-2"
            : "tier-side-catalog flex h-full min-h-0 w-full flex-col p-3"
          : "p-4 lg:p-5"
      }`}
    >
      <div className={`flex items-center gap-2 ${sideMode ? "flex-wrap" : ""}`}>
        {sideMode ? (
          <button
            type="button"
            onClick={() => setCatalogCollapsed((collapsed) => !collapsed)}
            aria-expanded={!catalogCollapsed}
            aria-label={catalogCollapsed ? "전체 니케 목록 펼치기" : "전체 니케 목록 접기"}
            title={catalogCollapsed ? "전체 니케 목록 펼치기" : "전체 니케 목록 접기"}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--theme-text-soft)] transition hover:border-cyan-400 hover:text-[var(--text)]"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-5 w-5"
            >
              <path
                d={catalogCollapsed ? "m9 6 6 6-6 6" : "m15 6-6 6 6 6"}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        ) : null}

        {!catalogCollapsed ? (
          <>
            <h2 className={`shrink-0 font-semibold text-[var(--text)] ${sideMode ? "text-sm" : "text-lg"}`}>
              전체 니케 목록
            </h2>
            {sideMode ? settingsButton : null}
            <div
              data-tier-catalog-search
              className={`min-w-0 ${sideMode ? "basis-full max-w-none" : "flex-1"}`}
            >
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="니케 이름 검색"
                className={`w-full rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--text)] outline-none focus:border-cyan-400 ${
                  sideMode ? "px-2.5 py-1.5 text-xs" : "px-3 py-2 text-sm"
                }`}
              />
            </div>
            {!sideMode ? settingsButton : null}
          </>
        ) : null}

        {layoutMode === "bottom" ? (
          <button
            type="button"
            onClick={() => setCatalogCollapsed((collapsed) => !collapsed)}
            aria-expanded={!catalogCollapsed}
            aria-label={catalogCollapsed ? "전체 니케 목록 펼치기" : "전체 니케 목록 접기"}
            title={catalogCollapsed ? "전체 니케 목록 펼치기" : "전체 니케 목록 접기"}
            className="ml-auto grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--theme-text-soft)] transition hover:border-cyan-400 hover:text-[var(--text)]"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className={`h-5 w-5 transition-transform ${catalogCollapsed ? "rotate-180" : ""}`}
            >
              <path
                d="m6 9 6 6 6-6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        ) : null}
      </div>

      {!catalogCollapsed ? (
        <>
          {catalogSettingsOpen ? (
            <div
              data-tier-catalog-settings
              className={`mt-3 grid shrink-0 gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] ${
                sideMode ? "p-3 text-xs" : "p-4 text-sm sm:grid-cols-2"
              }`}
            >
              <label className="grid gap-2 text-[var(--theme-text-soft)]">
                <span className="flex items-center justify-between gap-3">
                  <span className="font-medium text-[var(--text)]">이미지 크기</span>
                  <span>{Math.round(catalogSettings.imageSize)}px</span>
                </span>
                <input
                  type="range"
                  min={40}
                  max={96}
                  step={1}
                  value={Math.round(catalogSettings.imageSize)}
                  onChange={(event) => updateCatalogSettings({
                    ...catalogSettings,
                    imageSize: Math.min(
                      TIER_CATALOG_IMAGE_SIZE_MAX,
                      Math.max(TIER_CATALOG_IMAGE_SIZE_MIN, Number(event.target.value))
                    ),
                  })}
                  className="w-full accent-cyan-400"
                />
              </label>

              <fieldset className="grid gap-2">
                <legend className="font-medium text-[var(--text)]">기본 정렬</legend>
                <div className="flex gap-2">
                  {([
                    ["name", "이름순"],
                    ["burst", "버스트순"],
                  ] as const).map(([sortMode, label]) => (
                    <label
                      key={sortMode}
                      className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1.5 transition ${
                        catalogSettings.sortMode === sortMode
                          ? "border-cyan-500/40 bg-cyan-500/10 text-[var(--text)]"
                          : "border-[var(--border)] text-[var(--theme-text-soft)]"
                      }`}
                    >
                      <input
                        type="radio"
                        name="tier-catalog-sort-mode"
                        value={sortMode}
                        checked={catalogSettings.sortMode === sortMode}
                        onChange={() => updateCatalogSettings({ ...catalogSettings, sortMode })}
                        className="accent-cyan-400"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
          ) : null}

          <div data-tier-filter-bar className="mt-3 flex w-full shrink-0 items-center justify-start gap-1 overflow-x-auto pb-1">
            {bursts.map((burst) => (
              <button
                key={burst.n}
                type="button"
                onClick={() => setSelectedBursts((prev) => toggleValue(prev, burst.n))}
                className={filterButtonClass(selectedBursts.has(burst.n))}
              >
                {burst.label}
              </button>
            ))}
            {elements.map((element) => (
              <button
                key={element.v}
                type="button"
                onClick={() => setSelectedElements((prev) => toggleValue(prev, element.v))}
                className={filterButtonClass(selectedElements.has(element.v))}
              >
                {element.label}
              </button>
            ))}
            {roles.map((role) => (
              <button
                key={role.v}
                type="button"
                onClick={() => setSelectedRoles((prev) => toggleValue(prev, role.v))}
                className={filterButtonClass(selectedRoles.has(role.v))}
              >
                {role.label}
              </button>
            ))}
          </div>

          <div
            data-tier-catalog-scroll-region
            className={sideMode ? "mt-3 min-h-0 flex-1 overflow-y-auto pr-1" : ""}
          >
            {filteredNikkes.length > 0 ? (
              <div
                ref={catalogGridRef}
                data-tier-catalog-grid
                style={catalogGridStyle}
                className={
                  sideMode
                    ? "tier-side-catalog-grid grid"
                    : "mt-4 grid gap-2"
                }
              >
                {catalogSettings.sortMode === "name"
                  ? filteredNikkes.map((nikke) => (
                      <CatalogCard
                        key={nikke.id}
                        nikke={nikke}
                        assigned={assignedTiers.has(nikke.name)}
                        canEdit={canEdit}
                        getPublicUrl={getPublicUrl}
                        onImageClick={onImageClick}
                      />
                    ))
                  : burstGroups.map((group) => (
                      <div key={group.burst ?? "other"} style={{ display: "contents" }}>
                        <div
                          data-tier-burst-separator
                          style={{ gridColumn: "1 / -1" }}
                          className="flex items-center gap-2 py-1 font-semibold text-[var(--theme-text-soft)]"
                        >
                          <span>{group.burst ? BURST_GROUP_LABELS[group.burst] : "기타"}</span>
                          <span className="h-px flex-1 bg-[var(--border)]" aria-hidden="true" />
                        </div>
                        {group.nikkes.map((nikke) => (
                          <CatalogCard
                            key={nikke.id}
                            nikke={nikke}
                            assigned={assignedTiers.has(nikke.name)}
                            canEdit={canEdit}
                            getPublicUrl={getPublicUrl}
                            onImageClick={onImageClick}
                          />
                        ))}
                      </div>
                    ))}
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-dashed border-[var(--border)] p-8 text-center text-sm text-[var(--muted)]">
                조건에 맞는 니케가 없습니다.
              </div>
            )}
          </div>
        </>
      ) : null}
    </section>
  );
}

function readCatalogSettings(): TierCatalogSettings {
  if (typeof window === "undefined") return DEFAULT_TIER_CATALOG_SETTINGS;
  try {
    return parseTierCatalogSettings(window.localStorage.getItem(TIER_CATALOG_SETTINGS_KEY)) ?? DEFAULT_TIER_CATALOG_SETTINGS;
  } catch {
    return DEFAULT_TIER_CATALOG_SETTINGS;
  }
}

const BURST_GROUP_LABELS = { 1: "Ⅰ", 2: "Ⅱ", 3: "Ⅲ" } as const;
