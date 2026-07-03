"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { formatNikkeDisplayName, formatNikkeDisplayNames } from "../../../lib/nikke-display";
import {
  canDeleteSoloRaidSchedule,
  canEditSoloRaidScheduleWindow,
  formatIsoToKstDateTimeInput,
  type SoloRaidScheduleStatus,
} from "../../../lib/solo-raid-schedule";
import type { ScoreDisplayMode } from "../../../lib/score-format";

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
type BossUserStat = {
  raidKey: string;
  raidLabel: string;
  userCount: number;
  active: boolean;
  endedAt: number | null;
};

type SoloRaidSchedule = {
  id: string;
  raidKey: string;
  raidLabel: string;
  description: string;
  imagePath: string;
  startsAt: string;
  endsAt: string;
  status: SoloRaidScheduleStatus;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  endedAt: string | null;
};

type DeckTabItem = {
  readonly key: string;
  readonly label: string;
};

type FilterOption = {
  readonly v: string;
  readonly label: string;
};
type NikkeRow = {
  id: string;
  name: string;
  image_path: string | null;
  burst: number | null;
  element: string | null;
  role: string | null;
  aliases: string[];
};

type NikkeElementValue = "iron" | "fire" | "wind" | "water" | "electric" | null;
type NikkeRoleValue = "attacker" | "supporter" | "defender" | null;
type AdminSectionKey = "nikkes" | "recommended" | "bosses" | "video";
type ThemeMode = "dark" | "light";

type MyPageTabProps = {
  deckTabs: readonly DeckTabItem[];
  isMaster: boolean;
  showBossManagement: boolean;
  recommendationHistory: Record<string, RecommendationRecord>;
  onlineUserCount: number;
  totalUserCount: number;
  bossUserStats: readonly BossUserStat[];
  loadingUserStats: boolean;
  soloRaidActive: boolean;
  onSyncNikkes: () => Promise<void>;
  syncingNikkes: boolean;
  onAddNikke: (payload: {
    name: string;
    burst: number | null;
    element: NikkeElementValue;
    role: NikkeRoleValue;
    aliases: string[];
    imagePath: string;
  }) => Promise<boolean>;
  onUpdateNikke: (payload: {
    id: string;
    name: string;
    image_path: string | null;
    burst: number | null;
    aliases: string[];
    element: NikkeElementValue;
    role: NikkeRoleValue;
  }) => Promise<boolean>;
  nikkes: NikkeRow[];
  recommendedNikkeNames: string[];
  onSaveRecommendedNikkes: (names: string[]) => Promise<boolean>;
  elements: readonly FilterOption[];
  roles: readonly FilterOption[];
  getPublicUrl: (bucket: "nikke-images" | "boss-images", path: string) => string;
  onAddSoloRaid: (payload: {
    title: string;
    description: string;
    imageFile: File | null;
    startsAtInput?: string;
    endsAtInput?: string;
  }) => Promise<boolean>;
  soloRaidSchedules: SoloRaidSchedule[];
  loadingSoloRaidSchedules: boolean;
  onAddSoloRaidSchedule: (payload: {
    title: string;
    description: string;
    imageFile: File | null;
    startsAtInput: string;
    endsAtInput: string;
  }) => Promise<boolean>;
  onUpdateSoloRaidSchedule: (payload: { id: string; startsAtInput: string; endsAtInput: string }) => Promise<boolean>;
  onDeleteSoloRaidSchedule: (id: string) => Promise<boolean>;
  onEndSoloRaid: () => Promise<boolean>;
  onRestartSoloRaid: () => Promise<boolean>;
  recommendedVideoUrl: string;
  onSaveRecommendedVideo: (url: string) => Promise<boolean>;
  showInquirySection: boolean;
  fmt: (value: number) => string;
  scoreDisplayMode: ScoreDisplayMode;
  onScoreDisplayModeChange: (mode: ScoreDisplayMode) => void;
  themeMode: ThemeMode;
  onThemeModeChange: (mode: ThemeMode) => void;
  persistSession: boolean;
  onPersistSessionChange: (persist: boolean) => void;
  activeRaidKey: string | null;
  rankingByRaidKey: Record<string, { rank: number; total: number }>;
};

function formatRankLabel(rank: number, total: number): string {
  if (total === 0) return "-";
  if (rank <= 10) return `${rank}등`;
  const pct = Math.ceil((rank / total) * 100);
  return `상위 ${Math.min(pct, 99)}%`;
}

function adminTabClass(active: boolean) {
  return active
    ? "rounded-2xl border border-white bg-white px-3 py-2 text-sm font-medium text-black"
    : "rounded-2xl border border-neutral-700 px-3 py-2 text-sm text-neutral-200";
}

function recFilterBtnClass(active: boolean) {
  return active
    ? "rec-filter-btn-active rounded-2xl border border-white bg-white px-3 py-2 text-sm font-medium text-black"
    : "rounded-2xl border border-neutral-700 px-3 py-2 text-sm text-neutral-200";
}

function scheduleStatusLabel(status: SoloRaidScheduleStatus) {
  if (status === "scheduled") return "예약";
  if (status === "active") return "진행 중";
  if (status === "completed") return "완료";
  return "취소";
}

function formatScheduleDateTime(value: string) {
  const input = formatIsoToKstDateTimeInput(value);
  if (!input) return "-";
  return input.replace("T", " ");
}

export default function MyPageTab({
  deckTabs,
  isMaster,
  showBossManagement,
  recommendationHistory,
  onlineUserCount,
  totalUserCount,
  bossUserStats,
  loadingUserStats,
  soloRaidActive,
  onSyncNikkes,
  syncingNikkes,
  onAddNikke,
  onUpdateNikke,
  nikkes,
  recommendedNikkeNames,
  onSaveRecommendedNikkes,
  elements,
  roles,
  getPublicUrl,
  onAddSoloRaid,
  soloRaidSchedules,
  loadingSoloRaidSchedules,
  onAddSoloRaidSchedule,
  onUpdateSoloRaidSchedule,
  onDeleteSoloRaidSchedule,
  onEndSoloRaid,
  onRestartSoloRaid,
  recommendedVideoUrl,
  onSaveRecommendedVideo,
  showInquirySection,
  fmt,
  scoreDisplayMode,
  onScoreDisplayModeChange,
  themeMode,
  onThemeModeChange,
  persistSession,
  onPersistSessionChange,
  activeRaidKey,
  rankingByRaidKey,
}: MyPageTabProps) {
  const [openRaidKey, setOpenRaidKey] = useState<string>("");
  const [adminSection, setAdminSection] = useState<AdminSectionKey>("nikkes");
  const [newRaidName, setNewRaidName] = useState("");
  const [newRaidDescription, setNewRaidDescription] = useState("");
  const [newRaidImageFile, setNewRaidImageFile] = useState<File | null>(null);
  const [newRaidStartsAt, setNewRaidStartsAt] = useState("");
  const [newRaidEndsAt, setNewRaidEndsAt] = useState("");
  const [raidImageInputKey, setRaidImageInputKey] = useState(0);
  const [savingRaid, setSavingRaid] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
  const [editingScheduleStartsAt, setEditingScheduleStartsAt] = useState("");
  const [editingScheduleEndsAt, setEditingScheduleEndsAt] = useState("");
  const [savingScheduleEditId, setSavingScheduleEditId] = useState<string | null>(null);
  const [deletingScheduleId, setDeletingScheduleId] = useState<string | null>(null);
  const [endingRaid, setEndingRaid] = useState(false);
  const [restartingRaid, setRestartingRaid] = useState(false);
  const [videoUrlInput, setVideoUrlInput] = useState(recommendedVideoUrl);
  const [savingVideo, setSavingVideo] = useState(false);
  const [selectedRecommendedCandidates, setSelectedRecommendedCandidates] = useState<Set<string>>(new Set());
  const [savingRecommendedNikkes, setSavingRecommendedNikkes] = useState(false);
  const [recFilterBursts, setRecFilterBursts] = useState<Set<number>>(new Set());
  const [recFilterElements, setRecFilterElements] = useState<Set<string>>(new Set());
  const [recListFilterBursts, setRecListFilterBursts] = useState<Set<number>>(new Set());
  const [recListFilterElements, setRecListFilterElements] = useState<Set<string>>(new Set());
  const [adminNikkeSearch, setAdminNikkeSearch] = useState("");
  const [adminNikkeFilterBursts, setAdminNikkeFilterBursts] = useState<Set<number>>(new Set());
  const [adminNikkeFilterElements, setAdminNikkeFilterElements] = useState<Set<string>>(new Set());
  const [nikkeName, setNikkeName] = useState("");
  const [nikkeBurst, setNikkeBurst] = useState<number | null>(null);
  const [nikkeElement, setNikkeElement] = useState<NikkeElementValue>(null);
  const [nikkeRole, setNikkeRole] = useState<NikkeRoleValue>(null);
  const [nikkeAliases, setNikkeAliases] = useState("");
  const [nikkeImageFileName, setNikkeImageFileName] = useState("");
  const [savingNikke, setSavingNikke] = useState(false);
  const [selectedNikkeForEdit, setSelectedNikkeForEdit] = useState<NikkeRow | null>(null);
  const [editingNikkeValues, setEditingNikkeValues] = useState<{
    name: string;
    image_path: string;
    burst: string;
    aliases: string;
    element: string;
    role: string;
  } | null>(null);
  const [editingNikkeField, setEditingNikkeField] = useState<string | null>(null);
  const [savingNikkeEdit, setSavingNikkeEdit] = useState(false);
  const recommendedNameSet = useMemo(() => new Set(recommendedNikkeNames), [recommendedNikkeNames]);
  const recommendedNikkes = useMemo(
    () => nikkes.filter((nikke) => recommendedNameSet.has(nikke.name)),
    [nikkes, recommendedNameSet]
  );
  const recFilteredNikkes = useMemo(() => {
    return nikkes.filter((nikke) => {
      if (recFilterBursts.size > 0) {
        const burst = nikke.burst ?? -1;
        if (!recFilterBursts.has(burst)) return false;
      }
      if (recFilterElements.size > 0) {
        if (!nikke.element || !recFilterElements.has(nikke.element)) return false;
      }
      return true;
    });
  }, [nikkes, recFilterBursts, recFilterElements]);
  const recListFiltered = useMemo(() => {
    return recommendedNikkes.filter((nikke) => {
      if (recListFilterBursts.size > 0) {
        const burst = nikke.burst ?? -1;
        if (!recListFilterBursts.has(burst)) return false;
      }
      if (recListFilterElements.size > 0) {
        if (!nikke.element || !recListFilterElements.has(nikke.element)) return false;
      }
      return true;
    });
  }, [recommendedNikkes, recListFilterBursts, recListFilterElements]);
  const adminFilteredNikkes = useMemo(() => {
    const query = adminNikkeSearch.trim().toLowerCase();

    return nikkes.filter((nikke) => {
      if (query) {
        const matchesName = nikke.name.toLowerCase().includes(query);
        const matchesAlias = nikke.aliases.some((alias) => alias.toLowerCase().includes(query));
        if (!matchesName && !matchesAlias) return false;
      }
      if (adminNikkeFilterBursts.size > 0) {
        const burst = nikke.burst ?? -1;
        if (!adminNikkeFilterBursts.has(burst)) return false;
      }
      if (adminNikkeFilterElements.size > 0) {
        if (!nikke.element || !adminNikkeFilterElements.has(nikke.element)) return false;
      }
      return true;
    });
  }, [adminNikkeFilterBursts, adminNikkeFilterElements, adminNikkeSearch, nikkes]);
  const bossUserStatsByKey = useMemo(() => new Map(bossUserStats.map((stat) => [stat.raidKey, stat])), [bossUserStats]);
  const displayBossUserStats = useMemo(() => {
    const fromTabs = deckTabs.map((tab) => {
      const saved = bossUserStatsByKey.get(tab.key);
      return (
        saved ?? {
          raidKey: tab.key,
          raidLabel: tab.label,
          userCount: 0,
          active: soloRaidActive && activeRaidKey === tab.key,
          endedAt: null,
        }
      );
    });

    const tabKeys = new Set(deckTabs.map((tab) => tab.key));
    return [...fromTabs, ...bossUserStats.filter((stat) => !tabKeys.has(stat.raidKey) && stat.endedAt)];
  }, [activeRaidKey, bossUserStats, bossUserStatsByKey, deckTabs, soloRaidActive]);

  useEffect(() => {
    if (!deckTabs.some((tab) => tab.key === openRaidKey)) {
      setOpenRaidKey("");
    }
  }, [deckTabs, openRaidKey]);

  useEffect(() => {
    setVideoUrlInput(recommendedVideoUrl);
  }, [recommendedVideoUrl]);

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
        startsAtInput: newRaidStartsAt,
        endsAtInput: newRaidEndsAt,
      });
      if (!saved) return;
      setNewRaidName("");
      setNewRaidDescription("");
      setNewRaidImageFile(null);
      setNewRaidStartsAt("");
      setNewRaidEndsAt("");
      setRaidImageInputKey((prev) => prev + 1);
    } finally {
      setSavingRaid(false);
    }
  }

  async function handleAddSoloRaidSchedule() {
    if (savingSchedule) return;
    setSavingSchedule(true);
    try {
      const saved = await onAddSoloRaidSchedule({
        title: newRaidName,
        description: newRaidDescription,
        imageFile: newRaidImageFile,
        startsAtInput: newRaidStartsAt,
        endsAtInput: newRaidEndsAt,
      });
      if (!saved) return;
      setNewRaidName("");
      setNewRaidDescription("");
      setNewRaidImageFile(null);
      setNewRaidStartsAt("");
      setNewRaidEndsAt("");
      setRaidImageInputKey((prev) => prev + 1);
    } finally {
      setSavingSchedule(false);
    }
  }

  function startEditingSchedule(schedule: SoloRaidSchedule) {
    setEditingScheduleId(schedule.id);
    setEditingScheduleStartsAt(formatIsoToKstDateTimeInput(schedule.startsAt));
    setEditingScheduleEndsAt(formatIsoToKstDateTimeInput(schedule.endsAt));
  }

  async function handleUpdateSoloRaidSchedule(scheduleId: string) {
    if (savingScheduleEditId) return;
    setSavingScheduleEditId(scheduleId);
    try {
      const saved = await onUpdateSoloRaidSchedule({
        id: scheduleId,
        startsAtInput: editingScheduleStartsAt,
        endsAtInput: editingScheduleEndsAt,
      });
      if (!saved) return;
      setEditingScheduleId(null);
      setEditingScheduleStartsAt("");
      setEditingScheduleEndsAt("");
    } finally {
      setSavingScheduleEditId(null);
    }
  }

  async function handleDeleteSoloRaidSchedule(scheduleId: string) {
    if (deletingScheduleId) return;
    setDeletingScheduleId(scheduleId);
    try {
      await onDeleteSoloRaidSchedule(scheduleId);
    } finally {
      setDeletingScheduleId(null);
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
        aliases: nikkeAliases
          .split(",")
          .map((alias) => alias.trim())
          .filter((alias, index, list) => alias.length > 0 && list.indexOf(alias) === index),
        imagePath: nikkeImageFileName.trim(),
      });
      if (!saved) return;
      setNikkeName("");
      setNikkeBurst(null);
      setNikkeElement(null);
      setNikkeRole(null);
      setNikkeAliases("");
      setNikkeImageFileName("");
      setRaidImageInputKey((prev) => prev + 1);
    } finally {
      setSavingNikke(false);
    }
  }

  async function handleSaveNikkeEdit() {
    if (!selectedNikkeForEdit || !editingNikkeValues || savingNikkeEdit) return;
    setSavingNikkeEdit(true);
    try {
      const burstNum = parseInt(editingNikkeValues.burst);
      const aliases = editingNikkeValues.aliases
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean);
      const ok = await onUpdateNikke({
        id: selectedNikkeForEdit.id,
        name: editingNikkeValues.name.trim(),
        image_path: editingNikkeValues.image_path.trim() || null,
        burst: isNaN(burstNum) ? null : burstNum,
        aliases,
        element: (editingNikkeValues.element || null) as NikkeElementValue,
        role: (editingNikkeValues.role || null) as NikkeRoleValue,
      });
      if (ok) {
        setSelectedNikkeForEdit((prev) =>
          prev
            ? {
                ...prev,
                name: editingNikkeValues.name.trim(),
                image_path: editingNikkeValues.image_path.trim() || null,
                burst: isNaN(burstNum) ? null : burstNum,
                aliases,
                element: (editingNikkeValues.element || null) as NikkeElementValue,
                role: (editingNikkeValues.role || null) as NikkeRoleValue,
              }
            : null
        );
        setEditingNikkeField(null);
      }
    } finally {
      setSavingNikkeEdit(false);
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

  async function handleRestartSoloRaid() {
    if (restartingRaid) return;
    setRestartingRaid(true);
    try {
      await onRestartSoloRaid();
    } finally {
      setRestartingRaid(false);
    }
  }

  async function handleSaveRecommendedVideo() {
    if (savingVideo) return;
    setSavingVideo(true);
    try {
      const saved = await onSaveRecommendedVideo(videoUrlInput);
      if (!saved) return;
      setVideoUrlInput((prev) => prev.trim());
    } finally {
      setSavingVideo(false);
    }
  }

  async function handleAddRecommendedNikke() {
    if (savingRecommendedNikkes) return;
    const names = Array.from(selectedRecommendedCandidates).filter((name) => !recommendedNikkeNames.includes(name));
    if (names.length === 0) return;

    setSavingRecommendedNikkes(true);
    try {
      const saved = await onSaveRecommendedNikkes([...recommendedNikkeNames, ...names]);
      if (saved) {
        setSelectedRecommendedCandidates(new Set());
      }
    } finally {
      setSavingRecommendedNikkes(false);
    }
  }

  function toggleRecommendedCandidate(name: string) {
    setSelectedRecommendedCandidates((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }

  async function handleRemoveRecommendedNikke(name: string) {
    if (savingRecommendedNikkes) return;

    setSavingRecommendedNikkes(true);
    try {
      await onSaveRecommendedNikkes(recommendedNikkeNames.filter((candidate) => candidate !== name));
    } finally {
      setSavingRecommendedNikkes(false);
    }
  }

  function renderAdminNikkeTile(nikke: NikkeRow, options?: { selected?: boolean; removable?: boolean; dimmed?: boolean; onClick?: () => void; onRemove?: () => void }) {
    const url = nikke.image_path ? getPublicUrl("nikke-images", nikke.image_path) : "";
    const displayName = formatNikkeDisplayName(nikke.name);

    return (
      <div
        key={nikke.id}
        role={options?.onClick ? "button" : undefined}
        tabIndex={options?.onClick ? 0 : undefined}
        onClick={options?.onClick}
        onKeyDown={(event) => {
          if (!options?.onClick) return;
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            options.onClick();
          }
        }}
        className={`relative isolate min-w-0 overflow-hidden rounded-2xl border p-1 text-left active:scale-[0.99] ${
          options?.dimmed
            ? "border-neutral-800 bg-neutral-800/20 opacity-40"
            : options?.selected
            ? "border-sky-300 bg-sky-500/10"
            : "border-neutral-800 bg-neutral-950/40"
        }`}
      >
        {options?.removable ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              options.onRemove?.();
            }}
            disabled={savingRecommendedNikkes}
            aria-label={`${displayName} 추천 니케 제거`}
            className="absolute right-2 top-2 z-10 grid h-7 w-7 place-items-center rounded-full border border-neutral-700 bg-neutral-950/85 text-sm font-semibold text-neutral-200 transition hover:border-red-400 hover:text-red-300 disabled:opacity-50"
          >
            X
          </button>
        ) : null}

        <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950/40">
          {url ? (
            <Image fill src={url} alt={displayName} className="object-cover" sizes="(max-width: 640px) 25vw, 128px" />
          ) : (
            <div className="grid h-full w-full place-items-center text-xs text-neutral-600">no image</div>
          )}
        </div>
        <div className="mt-1 h-[2.4em] overflow-hidden break-words text-xs font-medium leading-tight">{displayName}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">설정</h2>
            <div className="mt-1 text-sm text-neutral-400">점수 표기 방법을 전체 화면에 바로 적용합니다.</div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-neutral-800 bg-neutral-950/40 p-3">
          <div>
            <div className="text-sm font-medium text-neutral-100">점수 표기 방법</div>
            <div className="mt-1 text-xs text-neutral-400">기본값은 숫자 표기입니다.</div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onScoreDisplayModeChange("eok")}
              className={adminTabClass(scoreDisplayMode === "eok")}
            >
              00억
            </button>
            <button
              type="button"
              onClick={() => onScoreDisplayModeChange("number")}
              className={adminTabClass(scoreDisplayMode === "number")}
            >
              숫자 표기
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-neutral-800 bg-neutral-950/40 p-3">
          <div>
            <div className="text-sm font-medium text-neutral-100">테마</div>
            <div className="mt-1 text-xs text-neutral-400">선택한 테마는 새로고침 후에도 유지됩니다.</div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onThemeModeChange("light")}
              className={adminTabClass(themeMode === "light")}
            >
              Light
            </button>
            <button
              type="button"
              onClick={() => onThemeModeChange("dark")}
              className={adminTabClass(themeMode === "dark")}
            >
              Dark
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-neutral-800 bg-neutral-950/40 p-3">
          <div>
            <div className="text-sm font-medium text-neutral-100">상시 로그인</div>
            <div className="mt-1 text-xs text-neutral-400">브라우저 종료시 로그인 상태를 유지하거나 로그아웃 할 수 있습니다.</div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onPersistSessionChange(true)}
              className={adminTabClass(persistSession === true)}
            >
              On
            </button>
            <button
              type="button"
              onClick={() => onPersistSessionChange(false)}
              className={adminTabClass(persistSession === false)}
            >
              Off
            </button>
          </div>
        </div>
      </section>

      {showBossManagement ? (
        <section className="rounded-2xl border border-sky-500/30 bg-sky-500/5 p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">마스터 관리</h2>
            {isMaster ? (
              <span className="rounded-full border border-sky-500/40 bg-sky-500/10 px-2 py-1 text-xs font-medium text-sky-300">
                마스터 계정
              </span>
            ) : (
              <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-300">
                로그인 테스트
              </span>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={() => setAdminSection("nikkes")} className={adminTabClass(adminSection === "nikkes")}>
              니케 관리
            </button>
            <button type="button" onClick={() => setAdminSection("recommended")} className={adminTabClass(adminSection === "recommended")}>
              추천 니케
            </button>
            <button type="button" onClick={() => setAdminSection("bosses")} className={adminTabClass(adminSection === "bosses")}>
              보스 관리
            </button>
            <button type="button" onClick={() => setAdminSection("video")} className={adminTabClass(adminSection === "video")}>
              추천 영상
            </button>
          </div>

          {adminSection === "nikkes" ? (
            <div className="mt-4 space-y-4">
              <div className="rounded-2xl border border-neutral-800 bg-neutral-950/40 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-neutral-100">1. 이미지 버킷 동기화</div>
                    <div className="mt-1 text-xs text-neutral-400">
                      `nikke-images` 버킷에 있는 파일들을 니케 테이블에 자동 등록합니다.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void onSyncNikkes()}
                    disabled={syncingNikkes}
                    className="rounded-2xl border border-neutral-700 px-4 py-3 text-sm active:scale-[0.99] disabled:opacity-50"
                  >
                    {syncingNikkes ? "동기화 중..." : "이미지 동기화"}
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-neutral-800 bg-neutral-950/40 p-3">
                <div className="text-sm font-medium text-neutral-100">2. 니케 등록/수정</div>
                <div className="mt-2 space-y-2">
                  <input
                    value={nikkeName}
                    onChange={(event) => setNikkeName(event.target.value)}
                    placeholder="니케 이름"
                    className="w-full rounded-2xl border border-neutral-800 bg-neutral-950/50 px-4 py-3 text-sm outline-none"
                  />

                  <input
                    value={nikkeAliases}
                    onChange={(event) => setNikkeAliases(event.target.value)}
                    placeholder="aliases (comma separated)"
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
                      <option value="">버스트</option>
                      <option value="1">I</option>
                      <option value="2">II</option>
                      <option value="3">III</option>
                    </select>

                    <select
                      value={nikkeElement ?? ""}
                      onChange={(event) => setNikkeElement((event.target.value || null) as NikkeElementValue)}
                      className="rounded-2xl border border-neutral-800 bg-neutral-950/50 px-4 py-3 text-sm outline-none"
                    >
                      <option value="">속성</option>
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
                      <option value="">역할</option>
                      {roles.map((role) => (
                        <option key={role.v} value={role.v}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <input
                    type="text"
                    placeholder="파일명.webp (예: alice.webp)"
                    value={nikkeImageFileName}
                    onChange={(event) => setNikkeImageFileName(event.target.value)}
                    className="w-full rounded-2xl border border-neutral-800 bg-neutral-950/50 px-4 py-3 text-sm outline-none"
                  />

                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs text-neutral-400">
                      public/nikke-images/에 WebP 파일을 먼저 추가하고 배포하세요
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleAddNikke()}
                      disabled={savingNikke}
                      className="rounded-2xl border border-neutral-700 px-4 py-3 text-sm active:scale-[0.99] disabled:opacity-50"
                    >
                      {savingNikke ? "저장 중..." : "니케 저장"}
                    </button>
                  </div>
                </div>
              </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-950/40 p-3">
              <div className="text-sm font-medium text-neutral-100">3. 니케 목록 및 수정</div>
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                <section className="min-w-0 rounded-2xl border border-neutral-800 bg-neutral-900/40 p-3">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-semibold text-neutral-100">전체 니케 목록</div>
                    <input
                      value={adminNikkeSearch}
                      onChange={(event) => setAdminNikkeSearch(event.target.value)}
                      placeholder="니케 검색"
                      className="w-full rounded-2xl border border-neutral-800 bg-neutral-950/50 px-3 py-2 text-sm text-neutral-100 outline-none placeholder:text-neutral-500 focus:border-sky-500/60 sm:w-44"
                    />
                  </div>
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {[
                      { n: 1, label: "I" },
                      { n: 2, label: "II" },
                      { n: 3, label: "III" },
                    ].map((burst) => (
                      <button
                        key={burst.n}
                        type="button"
                        onClick={() =>
                          setAdminNikkeFilterBursts((prev) => {
                            const next = new Set(prev);
                            if (next.has(burst.n)) next.delete(burst.n); else next.add(burst.n);
                            return next;
                          })
                        }
                        className={recFilterBtnClass(adminNikkeFilterBursts.has(burst.n))}
                      >
                        {burst.label}
                      </button>
                    ))}
                    {elements.map((el) => (
                      <button
                        key={el.v}
                        type="button"
                        onClick={() =>
                          setAdminNikkeFilterElements((prev) => {
                            const next = new Set(prev);
                            if (next.has(el.v)) next.delete(el.v); else next.add(el.v);
                            return next;
                          })
                        }
                        className={recFilterBtnClass(adminNikkeFilterElements.has(el.v))}
                      >
                        {el.label}
                      </button>
                    ))}
                    {(adminNikkeSearch.trim() || adminNikkeFilterBursts.size > 0 || adminNikkeFilterElements.size > 0) && (
                      <button
                        type="button"
                        onClick={() => {
                          setAdminNikkeSearch("");
                          setAdminNikkeFilterBursts(new Set());
                          setAdminNikkeFilterElements(new Set());
                        }}
                        className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-semibold text-[var(--text)] transition hover:border-red-400 hover:bg-red-500/15 active:scale-[0.99]"
                      >
                        초기화
                      </button>
                    )}
                  </div>
                  <div className="max-h-[480px] overflow-y-auto pr-1">
                    {adminFilteredNikkes.length === 0 ? (
                      <div className="rounded-2xl border border-neutral-800 bg-neutral-950/40 p-4 text-sm text-neutral-400">
                        해당 조건에 맞는 니케가 없습니다.
                      </div>
                    ) : (
                      <div className="grid grid-cols-5 gap-1.5">
                        {adminFilteredNikkes.map((nikke) =>
                          renderAdminNikkeTile(nikke, {
                            selected: selectedNikkeForEdit?.id === nikke.id,
                            onClick: () => {
                              setSelectedNikkeForEdit(nikke);
                              setEditingNikkeValues({
                                name: nikke.name,
                                image_path: nikke.image_path ?? "",
                                burst: nikke.burst ? String(nikke.burst) : "",
                                aliases: nikke.aliases.join(", "),
                                element: nikke.element ?? "",
                                role: nikke.role ?? "",
                              });
                              setEditingNikkeField(null);
                            },
                          })
                        )}
                      </div>
                    )}
                  </div>
                </section>

                <section className="min-w-0 rounded-2xl border border-neutral-800 bg-neutral-900/40 p-3">
                  {selectedNikkeForEdit && editingNikkeValues ? (
                    <>
                      <div className="mb-1 text-sm font-semibold text-neutral-100">니케 정보 수정</div>
                      <div className="mb-3 text-xs text-neutral-400">항목을 더블클릭하여 수정</div>
                      <div className="space-y-2">
                        <div>
                          <div className="mb-1 text-xs text-neutral-400">이름</div>
                          {editingNikkeField === "name" ? (
                            <input
                              autoFocus
                              value={editingNikkeValues.name}
                              onChange={(e) => setEditingNikkeValues((prev) => prev ? { ...prev, name: e.target.value } : prev)}
                              onBlur={() => setEditingNikkeField(null)}
                              className="w-full rounded-lg border border-sky-500/50 bg-neutral-950/50 px-3 py-2 text-sm outline-none"
                            />
                          ) : (
                            <div
                              onDoubleClick={() => setEditingNikkeField("name")}
                              className="cursor-pointer rounded-lg border border-neutral-800 bg-neutral-950/40 px-3 py-2 text-sm text-neutral-100 hover:border-neutral-600"
                              title="더블클릭하여 수정"
                            >
                              {editingNikkeValues.name || <span className="text-neutral-500">-</span>}
                            </div>
                          )}
                        </div>

                        <div>
                          <div className="mb-1 text-xs text-neutral-400">이미지명</div>
                          {editingNikkeField === "image_path" ? (
                            <input
                              autoFocus
                              value={editingNikkeValues.image_path}
                              onChange={(e) => setEditingNikkeValues((prev) => prev ? { ...prev, image_path: e.target.value } : prev)}
                              onBlur={() => setEditingNikkeField(null)}
                              className="w-full rounded-lg border border-sky-500/50 bg-neutral-950/50 px-3 py-2 text-sm outline-none"
                            />
                          ) : (
                            <div
                              onDoubleClick={() => setEditingNikkeField("image_path")}
                              className="cursor-pointer rounded-lg border border-neutral-800 bg-neutral-950/40 px-3 py-2 text-sm text-neutral-100 hover:border-neutral-600"
                              title="더블클릭하여 수정"
                            >
                              {editingNikkeValues.image_path || <span className="text-neutral-500">-</span>}
                            </div>
                          )}
                        </div>

                        <div>
                          <div className="mb-1 text-xs text-neutral-400">버스트</div>
                          {editingNikkeField === "burst" ? (
                            <select
                              autoFocus
                              value={editingNikkeValues.burst}
                              onChange={(e) => setEditingNikkeValues((prev) => prev ? { ...prev, burst: e.target.value } : prev)}
                              onBlur={() => setEditingNikkeField(null)}
                              className="w-full rounded-lg border border-sky-500/50 bg-neutral-950/50 px-3 py-2 text-sm outline-none"
                            >
                              <option value="">-</option>
                              <option value="1">I</option>
                              <option value="2">II</option>
                              <option value="3">III</option>
                            </select>
                          ) : (
                            <div
                              onDoubleClick={() => setEditingNikkeField("burst")}
                              className="cursor-pointer rounded-lg border border-neutral-800 bg-neutral-950/40 px-3 py-2 text-sm text-neutral-100 hover:border-neutral-600"
                              title="더블클릭하여 수정"
                            >
                              {editingNikkeValues.burst === "1" ? "I" : editingNikkeValues.burst === "2" ? "II" : editingNikkeValues.burst === "3" ? "III" : <span className="text-neutral-500">-</span>}
                            </div>
                          )}
                        </div>

                        <div>
                          <div className="mb-1 text-xs text-neutral-400">속성</div>
                          {editingNikkeField === "element" ? (
                            <select
                              autoFocus
                              value={editingNikkeValues.element}
                              onChange={(e) => setEditingNikkeValues((prev) => prev ? { ...prev, element: e.target.value } : prev)}
                              onBlur={() => setEditingNikkeField(null)}
                              className="w-full rounded-lg border border-sky-500/50 bg-neutral-950/50 px-3 py-2 text-sm outline-none"
                            >
                              <option value="">-</option>
                              {elements.map((el) => (
                                <option key={el.v} value={el.v}>{el.label}</option>
                              ))}
                            </select>
                          ) : (
                            <div
                              onDoubleClick={() => setEditingNikkeField("element")}
                              className="cursor-pointer rounded-lg border border-neutral-800 bg-neutral-950/40 px-3 py-2 text-sm text-neutral-100 hover:border-neutral-600"
                              title="더블클릭하여 수정"
                            >
                              {elements.find((el) => el.v === editingNikkeValues.element)?.label ?? <span className="text-neutral-500">-</span>}
                            </div>
                          )}
                        </div>

                        <div>
                          <div className="mb-1 text-xs text-neutral-400">별칭 (aliases, 쉼표 구분)</div>
                          {editingNikkeField === "aliases" ? (
                            <input
                              autoFocus
                              value={editingNikkeValues.aliases}
                              onChange={(e) => setEditingNikkeValues((prev) => prev ? { ...prev, aliases: e.target.value } : prev)}
                              onBlur={() => setEditingNikkeField(null)}
                              className="w-full rounded-lg border border-sky-500/50 bg-neutral-950/50 px-3 py-2 text-sm outline-none"
                            />
                          ) : (
                            <div
                              onDoubleClick={() => setEditingNikkeField("aliases")}
                              className="cursor-pointer rounded-lg border border-neutral-800 bg-neutral-950/40 px-3 py-2 text-sm text-neutral-100 hover:border-neutral-600"
                              title="더블클릭하여 수정"
                            >
                              {editingNikkeValues.aliases || <span className="text-neutral-500">-</span>}
                            </div>
                          )}
                        </div>

                        <div>
                          <div className="mb-1 text-xs text-neutral-400">역할</div>
                          {editingNikkeField === "role" ? (
                            <select
                              autoFocus
                              value={editingNikkeValues.role}
                              onChange={(e) => setEditingNikkeValues((prev) => prev ? { ...prev, role: e.target.value } : prev)}
                              onBlur={() => setEditingNikkeField(null)}
                              className="w-full rounded-lg border border-sky-500/50 bg-neutral-950/50 px-3 py-2 text-sm outline-none"
                            >
                              <option value="">-</option>
                              {roles.map((r) => (
                                <option key={r.v} value={r.v}>{r.label}</option>
                              ))}
                            </select>
                          ) : (
                            <div
                              onDoubleClick={() => setEditingNikkeField("role")}
                              className="cursor-pointer rounded-lg border border-neutral-800 bg-neutral-950/40 px-3 py-2 text-sm text-neutral-100 hover:border-neutral-600"
                              title="더블클릭하여 수정"
                            >
                              {roles.find((r) => r.v === editingNikkeValues.role)?.label ?? <span className="text-neutral-500">-</span>}
                            </div>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => void handleSaveNikkeEdit()}
                        disabled={savingNikkeEdit}
                        className="mt-4 w-full rounded-2xl border border-sky-500/40 bg-sky-500/10 px-4 py-3 text-sm font-semibold text-sky-100 active:scale-[0.99] disabled:opacity-50"
                      >
                        {savingNikkeEdit ? "수정 중..." : "수정하기"}
                      </button>
                    </>
                  ) : (
                    <div className="flex min-h-[200px] items-center justify-center text-sm text-neutral-500">
                      왼쪽 목록에서 니케를 선택하세요
                    </div>
                  )}
                </section>
              </div>
            </div>
            </div>
          ) : null}

          {adminSection === "recommended" ? (
            <div className="mt-4 rounded-2xl border border-neutral-800 bg-neutral-950/40 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-neutral-100">추천 니케</div>
                  <div className="mt-1 text-xs text-neutral-400">니케 관리 탭의 전체 니케 목록에서 사용하는 데이터와 연동됩니다.</div>
                </div>
                <div className="rounded-full border border-neutral-700 px-3 py-1 text-xs text-neutral-300">
                  {recommendedNikkes.length}개
                </div>
              </div>

              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                <section className="min-w-0 rounded-2xl border border-neutral-800 bg-neutral-900/40 p-3">
                  <div className="mb-2 text-sm font-semibold text-neutral-100">추천 니케</div>

                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {[
                      { n: 1, label: "I" },
                      { n: 2, label: "II" },
                      { n: 3, label: "III" },
                    ].map((burst) => (
                      <button
                        key={burst.n}
                        type="button"
                        onClick={() =>
                          setRecListFilterBursts((prev) => {
                            const next = new Set(prev);
                            if (next.has(burst.n)) next.delete(burst.n); else next.add(burst.n);
                            return next;
                          })
                        }
                        className={recFilterBtnClass(recListFilterBursts.has(burst.n))}
                      >
                        {burst.label}
                      </button>
                    ))}
                    {elements.map((el) => (
                      <button
                        key={el.v}
                        type="button"
                        onClick={() =>
                          setRecListFilterElements((prev) => {
                            const next = new Set(prev);
                            if (next.has(el.v)) next.delete(el.v); else next.add(el.v);
                            return next;
                          })
                        }
                        className={recFilterBtnClass(recListFilterElements.has(el.v))}
                      >
                        {el.label}
                      </button>
                    ))}
                    {(recListFilterBursts.size > 0 || recListFilterElements.size > 0) && (
                      <button
                        type="button"
                        onClick={() => { setRecListFilterBursts(new Set()); setRecListFilterElements(new Set()); }}
                        className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-semibold text-[var(--text)] transition hover:border-red-400 hover:bg-red-500/15 active:scale-[0.99]"
                      >
                        초기화
                      </button>
                    )}
                  </div>

                  <div className="max-h-[520px] overflow-y-auto pr-1">
                    {recommendedNikkes.length === 0 ? (
                      <div className="rounded-2xl border border-neutral-800 bg-neutral-950/40 p-4 text-sm text-neutral-400">
                        추천 니케가 없습니다.
                      </div>
                    ) : recListFiltered.length === 0 ? (
                      <div className="rounded-2xl border border-neutral-800 bg-neutral-950/40 p-4 text-sm text-neutral-400">
                        해당 필터에 맞는 니케가 없습니다.
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 xl:grid-cols-5">
                        {recListFiltered.map((nikke) =>
                          renderAdminNikkeTile(nikke, {
                            removable: true,
                            onRemove: () => void handleRemoveRecommendedNikke(nikke.name),
                          })
                        )}
                      </div>
                    )}
                  </div>
                </section>

                <section className="min-w-0 rounded-2xl border border-neutral-800 bg-neutral-900/40 p-3">
                  <div className="mb-2 text-sm font-semibold text-neutral-100">전체 니케 목록</div>

                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {[
                      { n: 1, label: "I" },
                      { n: 2, label: "II" },
                      { n: 3, label: "III" },
                    ].map((burst) => (
                      <button
                        key={burst.n}
                        type="button"
                        onClick={() =>
                          setRecFilterBursts((prev) => {
                            const next = new Set(prev);
                            if (next.has(burst.n)) next.delete(burst.n); else next.add(burst.n);
                            return next;
                          })
                        }
                        className={recFilterBtnClass(recFilterBursts.has(burst.n))}
                      >
                        {burst.label}
                      </button>
                    ))}
                    {elements.map((el) => (
                      <button
                        key={el.v}
                        type="button"
                        onClick={() =>
                          setRecFilterElements((prev) => {
                            const next = new Set(prev);
                            if (next.has(el.v)) next.delete(el.v); else next.add(el.v);
                            return next;
                          })
                        }
                        className={recFilterBtnClass(recFilterElements.has(el.v))}
                      >
                        {el.label}
                      </button>
                    ))}
                    {(recFilterBursts.size > 0 || recFilterElements.size > 0) && (
                      <button
                        type="button"
                        onClick={() => { setRecFilterBursts(new Set()); setRecFilterElements(new Set()); }}
                        className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-semibold text-[var(--text)] transition hover:border-red-400 hover:bg-red-500/15 active:scale-[0.99]"
                      >
                        초기화
                      </button>
                    )}
                  </div>

                  <div className="max-h-[520px] overflow-y-auto pr-1">
                    {recFilteredNikkes.length === 0 ? (
                      <div className="rounded-2xl border border-neutral-800 bg-neutral-950/40 p-4 text-sm text-neutral-400">
                        표시할 니케가 없습니다.
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 xl:grid-cols-5">
                        {recFilteredNikkes.map((nikke) => {
                          const isDimmed = recommendedNameSet.has(nikke.name);
                          return renderAdminNikkeTile(nikke, {
                            selected: !isDimmed && selectedRecommendedCandidates.has(nikke.name),
                            dimmed: isDimmed,
                            onClick: isDimmed ? undefined : () => toggleRecommendedCandidate(nikke.name),
                          });
                        })}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleAddRecommendedNikke()}
                    disabled={
                      Array.from(selectedRecommendedCandidates).every((name) => recommendedNameSet.has(name)) || savingRecommendedNikkes
                    }
                    className="mt-3 w-full rounded-2xl border border-sky-500/40 bg-sky-500/10 px-4 py-3 text-sm font-semibold text-sky-100 active:scale-[0.99] disabled:opacity-50"
                  >
                    추천니케 추가{selectedRecommendedCandidates.size > 0 ? ` (${selectedRecommendedCandidates.size})` : ""}
                  </button>
                </section>
              </div>
            </div>
          ) : null}

          {adminSection === "bosses" ? (
            <div className="mt-4 space-y-4">
              <div className="rounded-2xl border border-neutral-800 bg-neutral-950/40 p-3">
                <div className="text-sm font-medium text-neutral-100">1. 솔로레이드 보스 추가</div>
                <div className="mt-1 text-xs text-neutral-400">
                  예약 추가는 시작/종료 시각을 사용하고, 즉시 추가는 종료 시각이 있으면 해당 시각에 자동 종료됩니다.
                </div>
                <div className="mt-2 space-y-2">
                  <input
                    value={newRaidName}
                    onChange={(event) => setNewRaidName(event.target.value)}
                    placeholder="보스 이름"
                    className="w-full rounded-2xl border border-neutral-800 bg-neutral-950/50 px-4 py-3 text-sm outline-none"
                  />
                  <textarea
                    value={newRaidDescription}
                    onChange={(event) => setNewRaidDescription(event.target.value)}
                    placeholder="보스 설명"
                    className="h-24 w-full resize-none rounded-2xl border border-neutral-800 bg-neutral-950/50 px-4 py-3 text-sm outline-none"
                  />
                  <input
                    key={raidImageInputKey}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(event) => setNewRaidImageFile(event.target.files?.[0] ?? null)}
                    className="w-full rounded-2xl border border-neutral-800 bg-neutral-950/50 px-4 py-3 text-sm outline-none file:mr-3 file:rounded-xl file:border-0 file:bg-neutral-800 file:px-3 file:py-2 file:text-sm file:text-neutral-100"
                  />
                  <div className="grid gap-2 lg:grid-cols-2">
                    <label className="block">
                      <span className="mb-1 block text-xs text-neutral-400">시작 시각</span>
                      <input
                        type="datetime-local"
                        value={newRaidStartsAt}
                        onChange={(event) => setNewRaidStartsAt(event.target.value)}
                        className="w-full rounded-2xl border border-neutral-800 bg-neutral-950/50 px-4 py-3 text-sm outline-none"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs text-neutral-400">종료 시각</span>
                      <input
                        type="datetime-local"
                        value={newRaidEndsAt}
                        onChange={(event) => setNewRaidEndsAt(event.target.value)}
                        className="w-full rounded-2xl border border-neutral-800 bg-neutral-950/50 px-4 py-3 text-sm outline-none"
                      />
                    </label>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs text-neutral-400">
                      {newRaidImageFile ? `선택된 이미지: ${newRaidImageFile.name}` : "보스 이미지 파일을 선택해주세요"}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void handleAddSoloRaid()}
                        disabled={savingRaid || savingSchedule}
                        className="rounded-2xl border border-neutral-700 px-4 py-3 text-sm active:scale-[0.99] disabled:opacity-50"
                      >
                        {savingRaid ? "추가 중..." : "즉시 추가"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleAddSoloRaidSchedule()}
                        disabled={savingSchedule || savingRaid}
                        className="rounded-2xl border border-sky-700/70 px-4 py-3 text-sm text-sky-200 active:scale-[0.99] disabled:opacity-50"
                      >
                        {savingSchedule ? "예약 중..." : "예약 추가"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-neutral-800 bg-neutral-950/40 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-neutral-100">2. 예약된 레이드 관리</div>
                    <div className="mt-1 text-xs text-neutral-400">예약 상태만 기간 정정과 삭제가 가능합니다.</div>
                  </div>
                  <div className="rounded-full border border-neutral-700 px-3 py-1 text-[11px] text-neutral-300">
                    {loadingSoloRaidSchedules ? "불러오는 중" : `${soloRaidSchedules.length}개`}
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  {soloRaidSchedules.length === 0 ? (
                    <div className="rounded-2xl border border-neutral-800 px-4 py-3 text-sm text-neutral-400">
                      예약된 레이드가 없습니다.
                    </div>
                  ) : (
                    soloRaidSchedules.map((schedule) => {
                      const editable = canEditSoloRaidScheduleWindow(schedule.status);
                      const deletable = canDeleteSoloRaidSchedule(schedule.status);
                      const isEditing = editingScheduleId === schedule.id;
                      return (
                        <div key={schedule.id} className="rounded-2xl border border-neutral-800 px-3 py-3">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-semibold text-neutral-100">{schedule.raidLabel}</span>
                                <span className="rounded-full border border-neutral-700 px-2 py-0.5 text-[11px] text-neutral-300">
                                  {scheduleStatusLabel(schedule.status)}
                                </span>
                              </div>
                              <div className="mt-1 text-xs text-neutral-400">
                                {formatScheduleDateTime(schedule.startsAt)} - {formatScheduleDateTime(schedule.endsAt)}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => (isEditing ? setEditingScheduleId(null) : startEditingSchedule(schedule))}
                                disabled={!editable}
                                className="rounded-2xl border border-neutral-700 px-3 py-2 text-xs active:scale-[0.99] disabled:opacity-50"
                              >
                                {isEditing ? "취소" : "기간 정정"}
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleDeleteSoloRaidSchedule(schedule.id)}
                                disabled={!deletable || deletingScheduleId === schedule.id}
                                className="rounded-2xl border border-red-800/60 px-3 py-2 text-xs text-red-300 active:scale-[0.99] disabled:opacity-50"
                              >
                                {deletingScheduleId === schedule.id ? "삭제 중..." : "삭제"}
                              </button>
                            </div>
                          </div>
                          {isEditing ? (
                            <div className="mt-3 grid gap-2 lg:grid-cols-[1fr_1fr_auto]">
                              <input
                                type="datetime-local"
                                value={editingScheduleStartsAt}
                                onChange={(event) => setEditingScheduleStartsAt(event.target.value)}
                                className="rounded-2xl border border-neutral-800 bg-neutral-950/50 px-4 py-3 text-sm outline-none"
                              />
                              <input
                                type="datetime-local"
                                value={editingScheduleEndsAt}
                                onChange={(event) => setEditingScheduleEndsAt(event.target.value)}
                                className="rounded-2xl border border-neutral-800 bg-neutral-950/50 px-4 py-3 text-sm outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => void handleUpdateSoloRaidSchedule(schedule.id)}
                                disabled={savingScheduleEditId === schedule.id}
                                className="rounded-2xl border border-emerald-800/60 px-4 py-3 text-sm text-emerald-300 active:scale-[0.99] disabled:opacity-50"
                              >
                                {savingScheduleEditId === schedule.id ? "저장 중..." : "저장"}
                              </button>
                            </div>
                          ) : null}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-neutral-800 bg-neutral-950/40 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-neutral-100">3. 솔로레이드 종료</div>
                    <div className="mt-1 text-xs text-neutral-400">
                      종료하면 현재 활성 레이드가 비활성화되고 기본 화면으로 돌아갑니다.
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void handleRestartSoloRaid()}
                      disabled={restartingRaid || soloRaidActive}
                      className="rounded-2xl border border-emerald-800/60 px-4 py-3 text-sm text-emerald-300 active:scale-[0.99] disabled:opacity-50"
                    >
                      {restartingRaid ? "재시작 중..." : "레이드 재시작"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleEndSoloRaid()}
                      disabled={endingRaid || !soloRaidActive}
                      className="rounded-2xl border border-red-800/60 px-4 py-3 text-sm text-red-300 active:scale-[0.99] disabled:opacity-50"
                    >
                      {endingRaid ? "종료 중..." : "레이드 종료"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {adminSection === "video" ? (
            <div className="mt-4 rounded-2xl border border-neutral-800 bg-neutral-950/40 p-3">
              <div className="text-sm font-medium text-neutral-100">추천 영상</div>
              <div className="mt-1 text-xs text-neutral-400">
                유튜브 링크 1개만 저장되며, 저장하면 기존 추천 영상이 바로 교체됩니다.
              </div>

              <div className="mt-3 space-y-2">
                <input
                  value={videoUrlInput}
                  onChange={(event) => setVideoUrlInput(event.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full rounded-2xl border border-neutral-800 bg-neutral-950/50 px-4 py-3 text-sm outline-none"
                />
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 text-xs text-neutral-400">
                    {recommendedVideoUrl ? `현재 저장된 링크: ${recommendedVideoUrl}` : "현재 저장된 추천 영상이 없습니다."}
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleSaveRecommendedVideo()}
                    disabled={savingVideo}
                    className="rounded-2xl border border-neutral-700 px-4 py-3 text-sm active:scale-[0.99] disabled:opacity-50"
                  >
                    {savingVideo ? "저장 중..." : "영상 저장"}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {showBossManagement ? (
        <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-2xl border border-neutral-800 bg-neutral-950/40 p-3">
              <div className="text-xs text-neutral-400">현재 접속자</div>
              <div className="mt-1 text-2xl font-semibold tabular-nums text-neutral-100">{onlineUserCount}</div>
            </div>
            <div className="rounded-2xl border border-neutral-800 bg-neutral-950/40 p-3">
              <div className="text-xs text-neutral-400">누적 이용자</div>
              <div className="mt-1 text-2xl font-semibold tabular-nums text-neutral-100">
                {loadingUserStats ? "..." : Math.max(totalUserCount, onlineUserCount)}
              </div>
            </div>
          </div>

          <div className="mt-3 rounded-2xl border border-neutral-800 bg-neutral-950/40 p-3">
            <div className="mb-2 text-xs text-neutral-400">보스별 이용자</div>
            <div className="flex flex-wrap gap-2">
              {displayBossUserStats.length === 0 ? (
                <div className="text-sm text-neutral-500">0</div>
              ) : (
                displayBossUserStats.map((stat) => (
                  <button
                    key={stat.raidKey}
                    type="button"
                    className={`rounded-2xl border px-3 py-2 text-left transition active:scale-[0.99] ${
                      stat.active
                        ? "border-sky-500/50 bg-sky-500/10 text-sky-100"
                        : "border-neutral-700 bg-neutral-950/30 text-neutral-200"
                    }`}
                  >
                    <span className="mr-2 text-sm font-medium">{stat.raidLabel}</span>
                    <span className="text-sm tabular-nums text-neutral-400">{stat.userCount}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4">
        <h2 className="text-lg font-semibold">솔로레이드 기록</h2>

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
                    isOpen ? "bg-white text-black" : "text-neutral-200"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`text-xl ${isOpen ? "text-black/70" : "text-neutral-500"}`}>{isOpen ? "닫기" : "보기"}</span>
                </button>

                {isOpen ? (
                  <div className="border-t border-neutral-800 px-3 py-3">
                    {tabRecommendation ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm text-neutral-300">{tabRecommendation.raidLabel} 추천 기록</div>
                          <div className="text-lg font-semibold tabular-nums text-neutral-100">{fmt(tabRecommendation.total)}</div>
                        </div>

                        <div className="space-y-2">
                          {tabRecommendation.decks.map((deck, index) => (
                            <div key={`${tabRecommendation.raidKey}-${index}`} className="rounded-xl border border-neutral-800 px-3 py-2">
                              <div className="text-sm text-neutral-100">{formatNikkeDisplayNames(deck.chars)}</div>
                              <div className="mt-1 text-xs tabular-nums text-neutral-400">{fmt(deck.score)}</div>
                            </div>
                          ))}
                        </div>

                        {rankingByRaidKey[tab.key] ? (
                          <div className="flex items-center justify-between gap-3 rounded-xl border border-neutral-800 px-3 py-2">
                            <div className="text-xs text-neutral-400">웹 이용자 대비 내 등수</div>
                            <div className="text-sm font-semibold tabular-nums text-neutral-100">
                              {formatRankLabel(rankingByRaidKey[tab.key].rank, rankingByRaidKey[tab.key].total)}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <div className="text-sm text-neutral-400">해당 레이드에 저장된 추천 기록이 없습니다.</div>
                    )}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>

      {showInquirySection ? (
        <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">문의</h2>
              <div className="mt-1 text-sm text-neutral-400">문의하기 탭의 게시판에서 답글, 공개 여부, 해결 상태를 관리합니다.</div>
            </div>
          </div>
        </section>
      ) : null}

    </div>
  );
}
