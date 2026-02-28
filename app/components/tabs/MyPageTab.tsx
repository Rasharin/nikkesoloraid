"use client";

import { useEffect, useState } from "react";

type RecommendationDeck = {
  chars: string[];
  score: number;
};

type RecommendationRecord = {
  raidKey: string;
  raidLabel: string;
  total: number;
  decks: RecommendationDeck[];
  updatedAt: number;
};

type DeckTabItem = {
  readonly key: string;
  readonly label: string;
};

type FilterOption = {
  readonly v: string;
  readonly label: string;
};

type NikkeElementValue = "iron" | "fire" | "wind" | "water" | "electric" | null;
type NikkeRoleValue = "attacker" | "supporter" | "defender" | null;

type MyPageTabProps = {
  deckTabs: readonly DeckTabItem[];
  isMaster: boolean;
  showBossManagement: boolean;
  recommendationHistory: Record<string, RecommendationRecord>;
  soloRaidActive: boolean;
  onSyncNikkes: () => Promise<void>;
  syncingNikkes: boolean;
  onAddNikke: (payload: {
    name: string;
    burst: number | null;
    element: NikkeElementValue;
    role: NikkeRoleValue;
    imageFile: File | null;
  }) => Promise<boolean>;
  elements: readonly FilterOption[];
  roles: readonly FilterOption[];
  onAddSoloRaid: (payload: {
    title: string;
    description: string;
    imageFile: File | null;
  }) => Promise<boolean>;
  onEndSoloRaid: () => Promise<boolean>;
  fmt: (value: number) => string;
};

export default function MyPageTab({
  deckTabs,
  isMaster,
  showBossManagement,
  recommendationHistory,
  soloRaidActive,
  onSyncNikkes,
  syncingNikkes,
  onAddNikke,
  elements,
  roles,
  onAddSoloRaid,
  onEndSoloRaid,
  fmt,
}: MyPageTabProps) {
  const [openRaidKey, setOpenRaidKey] = useState<string>("");
  const [newRaidName, setNewRaidName] = useState("");
  const [newRaidDescription, setNewRaidDescription] = useState("");
  const [newRaidImageFile, setNewRaidImageFile] = useState<File | null>(null);
  const [raidImageInputKey, setRaidImageInputKey] = useState(0);
  const [savingRaid, setSavingRaid] = useState(false);
  const [endingRaid, setEndingRaid] = useState(false);

  const [nikkeName, setNikkeName] = useState("");
  const [nikkeBurst, setNikkeBurst] = useState<number | null>(null);
  const [nikkeElement, setNikkeElement] = useState<NikkeElementValue>(null);
  const [nikkeRole, setNikkeRole] = useState<NikkeRoleValue>(null);
  const [nikkeImageFile, setNikkeImageFile] = useState<File | null>(null);
  const [nikkeImageInputKey, setNikkeImageInputKey] = useState(0);
  const [savingNikke, setSavingNikke] = useState(false);

  useEffect(() => {
    if (!deckTabs.some((tab) => tab.key === openRaidKey)) {
      setOpenRaidKey("");
    }
  }, [deckTabs, openRaidKey]);

  function toggleRaid(key: string) {
    setOpenRaidKey((prev) => (prev === key ? "" : key));
  }

  async function handleAddSoloRaid() {
    if (savingRaid) return;
    setSavingRaid(true);
    try {
      const saved = await onAddSoloRaid({
        title: newRaidName,
        description: newRaidDescription,
        imageFile: newRaidImageFile,
      });
      if (!saved) return;
      setNewRaidName("");
      setNewRaidDescription("");
      setNewRaidImageFile(null);
      setRaidImageInputKey((prev) => prev + 1);
    } finally {
      setSavingRaid(false);
    }
  }

  async function handleAddNikke() {
    if (savingNikke) return;
    setSavingNikke(true);
    try {
      const saved = await onAddNikke({
        name: nikkeName,
        burst: nikkeBurst,
        element: nikkeElement,
        role: nikkeRole,
        imageFile: nikkeImageFile,
      });
      if (!saved) return;
      setNikkeName("");
      setNikkeBurst(null);
      setNikkeElement(null);
      setNikkeRole(null);
      setNikkeImageFile(null);
      setNikkeImageInputKey((prev) => prev + 1);
    } finally {
      setSavingNikke(false);
    }
  }

  async function handleEndSoloRaid() {
    if (endingRaid) return;
    setEndingRaid(true);
    try {
      await onEndSoloRaid();
    } finally {
      setEndingRaid(false);
    }
  }

  return (
    <div className="space-y-4">
      {isMaster ? (
        <section className="rounded-2xl border border-sky-500/30 bg-sky-500/5 p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Nikke Management</h2>
            <span className="rounded-full border border-sky-500/40 bg-sky-500/10 px-2 py-1 text-xs font-medium text-sky-300">
              Master only
            </span>
          </div>

          <div className="mt-4 space-y-4">
            <div className="rounded-2xl border border-neutral-800 bg-neutral-950/40 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-neutral-100">1. Sync from nikke-images bucket</div>
                  <div className="mt-1 text-xs text-neutral-400">
                    Register files already uploaded to storage into the nikke table.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void onSyncNikkes()}
                  disabled={syncingNikkes}
                  className="rounded-2xl border border-neutral-700 px-4 py-3 text-sm active:scale-[0.99] disabled:opacity-50"
                >
                  {syncingNikkes ? "Syncing..." : "Sync images"}
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-950/40 p-3">
              <div className="text-sm font-medium text-neutral-100">2. Add or update a nikke</div>
              <div className="mt-2 space-y-2">
                <input
                  value={nikkeName}
                  onChange={(event) => setNikkeName(event.target.value)}
                  placeholder="Nikke name"
                  className="w-full rounded-2xl border border-neutral-800 bg-neutral-950/50 px-4 py-3 text-sm outline-none"
                />

                <div className="grid grid-cols-3 gap-2">
                  <select
                    value={nikkeBurst ?? ""}
                    onChange={(event) => {
                      const value = Number(event.target.value);
                      setNikkeBurst(Number.isFinite(value) && value > 0 ? value : null);
                    }}
                    className="rounded-2xl border border-neutral-800 bg-neutral-950/50 px-4 py-3 text-sm outline-none"
                  >
                    <option value="">Burst</option>
                    <option value="1">I</option>
                    <option value="2">II</option>
                    <option value="3">III</option>
                  </select>

                  <select
                    value={nikkeElement ?? ""}
                    onChange={(event) => setNikkeElement((event.target.value || null) as NikkeElementValue)}
                    className="rounded-2xl border border-neutral-800 bg-neutral-950/50 px-4 py-3 text-sm outline-none"
                  >
                    <option value="">Element</option>
                    {elements.map((element) => (
                      <option key={element.v} value={element.v}>
                        {element.label}
                      </option>
                    ))}
                  </select>

                  <select
                    value={nikkeRole ?? ""}
                    onChange={(event) => setNikkeRole((event.target.value || null) as NikkeRoleValue)}
                    className="rounded-2xl border border-neutral-800 bg-neutral-950/50 px-4 py-3 text-sm outline-none"
                  >
                    <option value="">Role</option>
                    {roles.map((role) => (
                      <option key={role.v} value={role.v}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                </div>

                <input
                  key={nikkeImageInputKey}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(event) => setNikkeImageFile(event.target.files?.[0] ?? null)}
                  className="w-full rounded-2xl border border-neutral-800 bg-neutral-950/50 px-4 py-3 text-sm outline-none file:mr-3 file:rounded-xl file:border-0 file:bg-neutral-800 file:px-3 file:py-2 file:text-sm file:text-neutral-100"
                />

                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs text-neutral-400">
                    {nikkeImageFile ? `Selected image: ${nikkeImageFile.name}` : "Choose a nikke image file"}
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleAddNikke()}
                    disabled={savingNikke}
                    className="rounded-2xl border border-neutral-700 px-4 py-3 text-sm active:scale-[0.99] disabled:opacity-50"
                  >
                    {savingNikke ? "Saving..." : "Save nikke"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {showBossManagement ? (
        <section className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Solo Raid Boss Management</h2>
            {isMaster ? (
              <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-300">
                Master
              </span>
            ) : (
              <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-300">
                Local test
              </span>
            )}
          </div>

          <div className="mt-4 space-y-4">
            <div className="rounded-2xl border border-neutral-800 bg-neutral-950/40 p-3">
              <div className="text-sm font-medium text-neutral-100">1. Add solo raid boss</div>
              <div className="mt-2 space-y-2">
                <input
                  value={newRaidName}
                  onChange={(event) => setNewRaidName(event.target.value)}
                  placeholder="Boss name"
                  className="w-full rounded-2xl border border-neutral-800 bg-neutral-950/50 px-4 py-3 text-sm outline-none"
                />
                <textarea
                  value={newRaidDescription}
                  onChange={(event) => setNewRaidDescription(event.target.value)}
                  placeholder="Boss description"
                  className="h-24 w-full resize-none rounded-2xl border border-neutral-800 bg-neutral-950/50 px-4 py-3 text-sm outline-none"
                />
                <input
                  key={raidImageInputKey}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(event) => setNewRaidImageFile(event.target.files?.[0] ?? null)}
                  className="w-full rounded-2xl border border-neutral-800 bg-neutral-950/50 px-4 py-3 text-sm outline-none file:mr-3 file:rounded-xl file:border-0 file:bg-neutral-800 file:px-3 file:py-2 file:text-sm file:text-neutral-100"
                />
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs text-neutral-400">
                    {newRaidImageFile ? `Selected image: ${newRaidImageFile.name}` : "Choose a boss image file"}
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleAddSoloRaid()}
                    disabled={savingRaid}
                    className="rounded-2xl border border-neutral-700 px-4 py-3 text-sm active:scale-[0.99] disabled:opacity-50"
                  >
                    {savingRaid ? "Saving..." : "Add boss"}
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-950/40 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-neutral-100">2. End solo raid</div>
                  <div className="mt-1 text-xs text-neutral-400">
                    Ending the raid switches the home boss card back to the default boss.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void handleEndSoloRaid()}
                  disabled={endingRaid || !soloRaidActive}
                  className="rounded-2xl border border-red-800/60 px-4 py-3 text-sm text-red-300 active:scale-[0.99] disabled:opacity-50"
                >
                  {endingRaid ? "Ending..." : "End raid"}
                </button>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4">
        <h2 className="text-lg font-semibold">Solo Raid History</h2>

        <div className="mt-3 space-y-2">
          {deckTabs.map((tab) => {
            const isOpen = openRaidKey === tab.key;
            const tabRecommendation = recommendationHistory[tab.key] ?? null;

            return (
              <div key={tab.key} className="rounded-2xl border border-neutral-800 bg-neutral-950/30">
                <button
                  type="button"
                  onClick={() => toggleRaid(tab.key)}
                  className={`flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left text-lg transition ${
                    isOpen ? "border-white bg-white text-black" : "text-neutral-200"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`text-xl ${isOpen ? "text-black/70" : "text-neutral-500"}`}>
                    {isOpen ? "Hide" : "Open"}
                  </span>
                </button>

                {isOpen ? (
                  <div className="border-t border-neutral-800 px-3 py-3">
                    {tabRecommendation ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm text-neutral-300">{tabRecommendation.raidLabel} recommendation</div>
                          <div className="text-lg font-semibold tabular-nums text-neutral-100">
                            {fmt(tabRecommendation.total)}
                          </div>
                        </div>

                        <div className="space-y-2">
                          {tabRecommendation.decks.map((deck, index) => (
                            <div key={`${tabRecommendation.raidKey}-${index}`} className="rounded-xl border border-neutral-800 px-3 py-2">
                              <div className="text-sm text-neutral-100">{deck.chars.join(" / ")}</div>
                              <div className="mt-1 text-xs tabular-nums text-neutral-400">{fmt(deck.score)}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-neutral-400">No saved recommendation for this raid yet.</div>
                    )}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
