"use client";

import Image from "next/image";
import { useDraggable } from "@dnd-kit/core";
import { useMemo, useState, type CSSProperties } from "react";
import { CSS } from "@dnd-kit/utilities";
import { formatNikkeDisplayName } from "../../../../lib/nikke-display";

export type TierNikkeRow = {
  id: string;
  name: string;
  image_path: string | null;
  burst: number | null;
  element: string | null;
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
};

function toggleValue<T>(set: Set<T>, value: T) {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

function CatalogCard({
  nikke,
  tierName,
  canEdit,
  getPublicUrl,
}: {
  nikke: TierNikkeRow;
  tierName?: string;
  canEdit: boolean;
  getPublicUrl: TierNikkeCatalogProps["getPublicUrl"];
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `tier-catalog-${nikke.id}`,
    disabled: !canEdit,
    data: { source: "catalog", nikkeName: nikke.name },
  });
  const style: CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.35 : 1,
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
      className={`group relative min-w-0 overflow-hidden rounded-xl border bg-[var(--card)] text-left transition ${
        canEdit ? "cursor-grab border-[var(--border)] active:cursor-grabbing" : "cursor-default border-[var(--border)]"
      }`}
    >
      <div className="relative aspect-square w-full bg-[var(--theme-panel)]">
        {imageUrl ? (
          <Image
            fill
            src={imageUrl}
            alt={formatNikkeDisplayName(nikke.name)}
            className="object-cover"
            sizes="(max-width: 640px) 25vw, 110px"
          />
        ) : (
          <div className="grid h-full place-items-center text-[10px] text-[var(--muted)]">no image</div>
        )}
        {tierName ? (
          <span className="absolute right-1 top-1 rounded-md bg-black/75 px-1.5 py-0.5 text-[10px] font-semibold text-white">
            {tierName}
          </span>
        ) : null}
      </div>
      <div className="truncate px-1.5 py-1.5 text-center text-[11px] text-[var(--theme-text-soft)]">
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
}: TierNikkeCatalogProps) {
  const [search, setSearch] = useState("");
  const [selectedBursts, setSelectedBursts] = useState<Set<number>>(new Set());
  const [selectedElements, setSelectedElements] = useState<Set<string>>(new Set());
  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(new Set());

  const filteredNikkes = useMemo(() => {
    const query = search.trim().toLowerCase();
    return nikkes.filter((nikke) => {
      if (
        query &&
        !nikke.name.toLowerCase().includes(query) &&
        !nikke.aliases.some((alias) => alias.toLowerCase().includes(query))
      ) {
        return false;
      }
      if (selectedBursts.size > 0) {
        const burst = nikke.burst ?? -1;
        if (!(burst === 0 || selectedBursts.has(burst))) return false;
      }
      if (selectedElements.size > 0 && (!nikke.element || !selectedElements.has(nikke.element))) {
        return false;
      }
      if (selectedRoles.size > 0 && (!nikke.role || !selectedRoles.has(nikke.role))) {
        return false;
      }
      return true;
    });
  }, [nikkes, search, selectedBursts, selectedElements, selectedRoles]);

  const filterButtonClass = (active: boolean) =>
    `rounded-lg border px-2.5 py-1 text-xs transition ${
      active
        ? "border-white bg-white text-black"
        : "border-[var(--border)] text-[var(--theme-text-soft)] hover:border-neutral-400"
    }`;

  return (
    <section className="rounded-3xl border border-[var(--border)] bg-[var(--theme-panel)] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.18)] lg:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text)]">전체 니케 목록</h2>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {canEdit ? "니케를 위 티어 줄로 드래그하세요." : "현재 공용 티어 배치를 확인할 수 있습니다."}
          </p>
        </div>
        <div className="w-full lg:max-w-md">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="니케 이름 검색"
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-cyan-400"
          />
          <div className="mt-2 grid gap-2">
            <div className="flex flex-wrap items-center gap-1">
              <span className="mr-1 text-xs text-[var(--muted)]">버스트</span>
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
            </div>
            <div className="flex flex-wrap items-center gap-1">
              <span className="mr-1 text-xs text-[var(--muted)]">코드</span>
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
            </div>
            <div className="flex flex-wrap items-center gap-1">
              <span className="mr-1 text-xs text-[var(--muted)]">클래스</span>
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
          </div>
        </div>
      </div>

      {filteredNikkes.length > 0 ? (
        <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-10">
          {filteredNikkes.map((nikke) => (
            <CatalogCard
              key={nikke.id}
              nikke={nikke}
              tierName={assignedTiers.get(nikke.name)}
              canEdit={canEdit}
              getPublicUrl={getPublicUrl}
            />
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-dashed border-[var(--border)] p-8 text-center text-sm text-[var(--muted)]">
          조건에 맞는 니케가 없습니다.
        </div>
      )}
    </section>
  );
}
