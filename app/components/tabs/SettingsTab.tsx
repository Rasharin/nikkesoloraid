"use client";

import React, { useMemo, useState } from "react";

type NikkeRow = {
  id: string;
  name: string;
  image_path: string | null;
  burst: number | null;
  element: string | null;
  role: string | null;
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
};

function NikkeName({ name }: { name: string }) {
  const parts = name.split(":");
  return (
    <div className="mt-1 h-[2.4em] overflow-hidden break-words text-[11px] font-medium leading-tight">
      {parts.length > 1 ? (
        <>
          {parts[0]}:
          <br />
          {parts.slice(1).join(":")}
        </>
      ) : (
        name
      )}
    </div>
  );
}

export default function SettingsTab({
  nikkes,
  selectedNames,
  toggleSelect,
  setSelectedNames,
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
}: SettingsTabProps) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const query = q.trim();

    return nikkes.filter((nikke) => {
      if (query && !nikke.name.includes(query)) return false;

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

  return (
    <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Select Nikkes</h2>
        <div className="text-xs text-neutral-400">
          {selectedNames.length} / {maxSelected}
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <input
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="Search nikke name"
          className="flex-1 rounded-2xl border border-neutral-800 bg-neutral-950/50 px-4 py-3 text-sm outline-none"
        />
        <button
          onClick={() => setSelectedNames([])}
          className="rounded-2xl border border-neutral-700 px-4 py-3 text-sm active:scale-[0.99]"
        >
          Clear
        </button>
      </div>

      <section className="mt-5 mb-3 rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4">
        <div className="grid gap-3">
          <div className="flex items-center gap-3">
            <div className="w-14 shrink-0 text-sm font-semibold text-neutral-200">Burst</div>
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

          <div className="flex items-center gap-3">
            <div className="w-14 shrink-0 text-sm font-semibold text-neutral-200">Element</div>
            <div className="flex flex-wrap gap-2">
              {elements.map((element) => (
                <button
                  key={element.v}
                  onClick={() => setSelectedElements((prev) => toggleSet(prev, element.v))}
                  className={btnClass(selectedElements.has(element.v))}
                >
                  {element.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-14 shrink-0 text-sm font-semibold text-neutral-200">Role</div>
            <div className="flex flex-wrap gap-2">
              {roles.map((role) => (
                <button
                  key={role.v}
                  onClick={() => setSelectedRoles((prev) => toggleSet(prev, role.v))}
                  className={btnClass(selectedRoles.has(role.v))}
                >
                  {role.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="mt-4 grid grid-cols-5 gap-2">
        {filtered.map((nikke) => {
          const selected = selectedNames.includes(nikke.name);
          const url = nikke.image_path ? getPublicUrl("nikke-images", nikke.image_path) : "";

          return (
            <button
              key={nikke.id}
              onClick={() => toggleSelect(nikke.name)}
              className={`min-w-0 rounded-2xl border p-1 text-left active:scale-[0.99] ${
                selected ? "border-white bg-neutral-900" : "border-neutral-800 bg-neutral-950/40"
              }`}
            >
              <div className="aspect-square w-full overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950/40">
                {url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={url} alt={nikke.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center text-xs text-neutral-600">no image</div>
                )}
              </div>
              <NikkeName name={nikke.name} />
            </button>
          );
        })}
      </div>
    </section>
  );
}
