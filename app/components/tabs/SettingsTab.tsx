"use client";

import React, { useMemo, useState } from "react";
import { formatNikkeDisplayName } from "../../../lib/nikke-display";

type NikkeRow = {
  id: string;
  name: string;
  image_path: string | null;
  burst: number | null;
  element: string | null;
  role: string | null;
  aliases: string[];
};

type ToggleValue = string | number;

type FilterOption = {
  readonly v: string;
  readonly label: string;
};

type SettingsTabProps = {
  nikkes: NikkeRow[];
  selectedNames: string[];
  toggleSelect: (name: string) => void;
  setSelectedNames: React.Dispatch<React.SetStateAction<string[]>>;
  favoriteNames: Set<string>;
  onToggleFavorite: (name: string) => void | Promise<void>;
  recommendedNames: string[];
  selectedBursts: Set<number>;
  setSelectedBursts: React.Dispatch<React.SetStateAction<Set<number>>>;
  selectedElements: Set<string>;
  setSelectedElements: React.Dispatch<React.SetStateAction<Set<string>>>;
  selectedRoles: Set<string>;
  setSelectedRoles: React.Dispatch<React.SetStateAction<Set<string>>>;
  toggleSet: <T extends ToggleValue>(set: Set<T>, value: T) => Set<T>;
  btnClass: (selected: boolean) => string;
  elements: readonly FilterOption[];
  roles: readonly FilterOption[];
  getPublicUrl: (bucket: "nikke-images" | "boss-images", path: string) => string;
  maxSelected: number;
  onResetFilters: () => void;
};

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      className={`transition ${open ? "rotate-180" : ""}`}
      aria-hidden="true"
    >
      <path
        d="M6 9L12 15L18 9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StarIcon({ active }: { active: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} aria-hidden="true">
      <path
        d="M12 3.5L14.8 9.2L21 10.1L16.5 14.5L17.6 20.7L12 17.8L6.4 20.7L7.5 14.5L3 10.1L9.2 9.2L12 3.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function NikkeName({ name }: { name: string }) {
  const displayName = formatNikkeDisplayName(name);
  const parts = displayName.split(":");

  return (
    <div className="mt-1 h-[2.4em] overflow-hidden break-words text-xs font-medium leading-tight">
      {parts.length > 1 ? (
        <>
          {parts[0]}:
          <br />
          {parts.slice(1).join(":")}
        </>
      ) : (
        displayName
      )}
    </div>
  );
}

type NikkeCardProps = {
  nikke: NikkeRow;
  selected: boolean;
  favorite: boolean;
  onSelect: (name: string) => void;
  onToggleFavorite: (name: string) => void | Promise<void>;
  getPublicUrl: (bucket: "nikke-images" | "boss-images", path: string) => string;
};

function NikkeCard({ nikke, selected, favorite, onSelect, onToggleFavorite, getPublicUrl }: NikkeCardProps) {
  const url = nikke.image_path ? getPublicUrl("nikke-images", nikke.image_path) : "";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(nikke.name)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(nikke.name);
        }
      }}
      className={`relative isolate min-w-0 overflow-hidden rounded-2xl border p-1 text-left active:scale-[0.99] ${
        selected ? "border-white bg-neutral-900" : "border-neutral-800 bg-neutral-950/40"
      }`}
    >
      <button
        type="button"
        aria-label={favorite ? `${nikke.name} 즐겨찾기 해제` : `${nikke.name} 즐겨찾기 추가`}
        onClick={(event) => {
          event.stopPropagation();
          void onToggleFavorite(nikke.name);
        }}
        className={`absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full border transition ${
          favorite
            ? "border-yellow-500/70 bg-yellow-500/20 text-yellow-300"
            : "border-neutral-700 bg-neutral-950/80 text-neutral-500 hover:border-neutral-500 hover:text-neutral-300"
        }`}
      >
        <StarIcon active={favorite} />
      </button>

      <div className="aspect-square w-full overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950/40">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={nikke.name} className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center text-xs text-neutral-600">no image</div>
        )}
      </div>
      <NikkeName name={nikke.name} />
    </div>
  );
}

type NikkeSectionProps = {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
};

function NikkeSection({ title, open, onToggle, children }: NikkeSectionProps) {
  return (
    <section className="relative isolate overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/40">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-neutral-100 active:scale-[0.99]"
      >
        <span>{title}</span>
        <span className="text-neutral-400">
          <ChevronIcon open={open} />
        </span>
      </button>
      {open ? <div className="overflow-x-hidden border-t border-neutral-800 p-4">{children}</div> : null}
    </section>
  );
}

export default function SettingsTab({
  nikkes,
  selectedNames,
  toggleSelect,
  setSelectedNames,
  favoriteNames,
  onToggleFavorite,
  recommendedNames,
  selectedBursts,
  setSelectedBursts,
  selectedElements,
  setSelectedElements,
  selectedRoles,
  setSelectedRoles,
  toggleSet,
  btnClass,
  elements,
  roles,
  getPublicUrl,
  maxSelected,
  onResetFilters,
}: SettingsTabProps) {
  const [q, setQ] = useState("");
  const [favoriteOpen, setFavoriteOpen] = useState(true);
  const [recommendedOpen, setRecommendedOpen] = useState(true);
  const [allNikkesOpen, setAllNikkesOpen] = useState(true);

  const filteredNikkes = useMemo(() => {
    const query = q.trim().toLowerCase();

    return nikkes.filter((nikke) => {
      if (query) {
        const matchesName = nikke.name.toLowerCase().includes(query);
        const matchesAlias = nikke.aliases.some((alias) => alias.toLowerCase().includes(query));
        if (!matchesName && !matchesAlias) return false;
      }

      if (selectedBursts.size > 0) {
        const burst = nikke.burst ?? -1;
        if (!(burst === 0 || selectedBursts.has(burst))) return false;
      }

      if (selectedElements.size > 0) {
        if (!nikke.element || !selectedElements.has(nikke.element)) return false;
      }

      if (selectedRoles.size > 0) {
        if (!nikke.role || !selectedRoles.has(nikke.role)) return false;
      }

      return true;
    });
  }, [nikkes, q, selectedBursts, selectedElements, selectedRoles]);

  const favoriteFilteredNikkes = useMemo(
    () => filteredNikkes.filter((nikke) => favoriteNames.has(nikke.name)),
    [favoriteNames, filteredNikkes]
  );
  const recommendedNameSet = useMemo(() => new Set(recommendedNames), [recommendedNames]);
  const recommendedFilteredNikkes = useMemo(
    () => filteredNikkes.filter((nikke) => recommendedNameSet.has(nikke.name)),
    [filteredNikkes, recommendedNameSet]
  );

  function renderNikkeGrid(list: NikkeRow[], emptyMessage: string) {
    if (list.length === 0) {
      return <div className="text-sm text-neutral-400">{emptyMessage}</div>;
    }

    return (
      <div className="grid grid-cols-4 gap-2 overflow-x-hidden sm:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
        {list.map((nikke) => (
          <NikkeCard
            key={nikke.id}
            nikke={nikke}
            selected={selectedNames.includes(nikke.name)}
            favorite={favoriteNames.has(nikke.name)}
            onSelect={toggleSelect}
            onToggleFavorite={onToggleFavorite}
            getPublicUrl={getPublicUrl}
          />
        ))}
      </div>
    );
  }

  return (
    <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">사용할 니케 선택</h2>
        <div className="text-xs text-neutral-400">
          {selectedNames.length} / {maxSelected}
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-3 lg:grid lg:grid-cols-[minmax(0,1.35fr)_300px] lg:items-start lg:gap-3">
        <div className="order-2 space-y-2 lg:order-1">
          <div className="mb-2 flex justify-end">
            <button
              type="button"
              onClick={() => setSelectedNames([])}
              className="rounded-2xl border border-red-800/60 bg-red-950/40 px-4 py-2 text-sm text-red-300 active:scale-[0.99]"
            >
              전체 해제
            </button>
          </div>

          <NikkeSection title="즐겨찾기" open={favoriteOpen} onToggle={() => setFavoriteOpen((prev) => !prev)}>
            {renderNikkeGrid(
              favoriteFilteredNikkes,
              q || selectedBursts.size || selectedElements.size || selectedRoles.size
                ? "조건에 맞는 즐겨찾기 니케가 없습니다."
                : "즐겨찾기한 니케가 없습니다."
            )}
          </NikkeSection>

          <NikkeSection title="추천 니케" open={recommendedOpen} onToggle={() => setRecommendedOpen((prev) => !prev)}>
            {renderNikkeGrid(
              recommendedFilteredNikkes,
              q || selectedBursts.size || selectedElements.size || selectedRoles.size
                ? "조건에 맞는 추천 니케가 없습니다."
                : "등록된 추천 니케가 없습니다."
            )}
          </NikkeSection>

          <NikkeSection title="전체 니케 목록" open={allNikkesOpen} onToggle={() => setAllNikkesOpen((prev) => !prev)}>
            {renderNikkeGrid(
              filteredNikkes,
              q || selectedBursts.size || selectedElements.size || selectedRoles.size
                ? "조건에 맞는 니케가 없습니다."
                : "표시할 니케가 없습니다."
            )}
          </NikkeSection>
        </div>

        <aside className="order-1 rounded-2xl border border-neutral-800 bg-neutral-900/40 p-3 lg:order-2 lg:sticky lg:top-24 lg:w-full">
          <h3 className="text-sm font-semibold text-neutral-100">이름 검색 및 필터</h3>

          <div className="mt-2">
            <div className="flex items-center rounded-2xl border border-neutral-800 bg-neutral-950/50 px-4">
              <input
                value={q}
                onChange={(event) => setQ(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    event.preventDefault();
                    setQ("");
                  }
                }}
                placeholder="니케 이름 검색"
                className="flex-1 bg-transparent py-2.5 text-sm text-neutral-100 outline-none placeholder:text-neutral-500"
              />

              <button
                type="button"
                onClick={() => setQ("")}
                aria-label="검색어 지우기"
                disabled={!q}
                style={{ borderRadius: "9999px" }}
                className={`ml-2 flex h-9 min-w-[36px] shrink-0 items-center justify-center appearance-none overflow-hidden border-0 p-0 transition active:scale-[0.98] ${
                  q ? "bg-neutral-800 text-neutral-100 hover:bg-neutral-700" : "bg-neutral-900/70 text-neutral-600"
                }`}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                >
                  <path d="M6 6L18 18" />
                  <path d="M18 6L6 18" />
                </svg>
              </button>
            </div>
          </div>

          <section className="mt-2 rounded-2xl border border-neutral-800 bg-neutral-900/40 p-3">
            <div className="grid gap-2.5">
              <div className="grid gap-1.5">
                <div className="text-sm font-semibold text-neutral-200">버스트</div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { n: 1, label: "I" },
                    { n: 2, label: "II" },
                    { n: 3, label: "III" },
                  ].map((burst) => (
                    <button
                      key={burst.n}
                      type="button"
                      onClick={() => setSelectedBursts((prev) => toggleSet(prev, burst.n))}
                      className={btnClass(selectedBursts.has(burst.n))}
                    >
                      {burst.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-1.5">
                <div className="text-sm font-semibold text-neutral-200">속성</div>
                <div className="flex flex-wrap gap-2">
                  {elements.map((element) => (
                    <button
                      key={element.v}
                      type="button"
                      onClick={() => setSelectedElements((prev) => toggleSet(prev, element.v))}
                      className={btnClass(selectedElements.has(element.v))}
                    >
                      {element.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-1.5">
                <div className="text-sm font-semibold text-neutral-200">역할</div>
                <div className="flex flex-wrap gap-2">
                  {roles.map((role) => (
                    <button
                      key={role.v}
                      type="button"
                      onClick={() => setSelectedRoles((prev) => toggleSet(prev, role.v))}
                      className={btnClass(selectedRoles.has(role.v))}
                    >
                      {role.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={onResetFilters}
                className="mt-1 rounded-2xl border border-red-800/60 bg-red-950/40 px-4 py-2 text-sm text-red-300 active:scale-[0.99]"
              >
                필터 초기화
              </button>
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}
