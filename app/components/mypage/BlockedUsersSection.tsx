"use client";

import { memo, useCallback, useEffect, useState } from "react";

type BlockedUser = {
  userId: string;
  userLabel: string;
  blockedAt: string;
};

function BlockedUsersSectionContent({ localPreview = false }: { localPreview?: boolean }) {
  const [users, setUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (localPreview) {
        setUsers((current) => current.length > 0 ? current : [{
          userId: "local-preview-user",
          userLabel: "local-preview@example.com",
          blockedAt: new Date().toISOString(),
        }]);
        return;
      }
      const response = await fetch("/api/admin/blocked-users", { credentials: "same-origin", cache: "no-store" });
      if (!response.ok) throw new Error(`blocked users failed: ${response.status}`);
      const payload = (await response.json()) as { users?: BlockedUser[] };
      setUsers(payload.users ?? []);
    } finally {
      setLoading(false);
    }
  }, [localPreview]);

  useEffect(() => { void load(); }, [load]);

  async function unblock(userId: string) {
    if (busyUserId || !window.confirm("이 사용자의 추천 데이터 차단을 해제하시겠습니까?")) return;
    setBusyUserId(userId);
    try {
      if (localPreview) {
        setUsers((current) => current.filter((user) => user.userId !== userId));
        return;
      }
      const response = await fetch(`/api/admin/blocked-users?userId=${encodeURIComponent(userId)}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      if (!response.ok) throw new Error(`unblock failed: ${response.status}`);
      await load();
    } finally {
      setBusyUserId(null);
    }
  }

  return (
    <div className="mt-4 space-y-2">
      <div className="rounded-2xl border border-neutral-800 bg-neutral-950/40 p-3">
        <div className="text-sm font-medium text-neutral-100">차단 유저 목록</div>
        <div className="mt-1 text-xs text-neutral-400">차단된 사용자의 기존 및 향후 저장 덱은 추천 조합에 적용되지 않습니다.</div>
        {localPreview ? <div className="mt-1 text-[11px] text-amber-300">로컬 미리보기 · 서버에 반영되지 않습니다.</div> : null}
      </div>
      {loading ? <div className="text-sm text-neutral-400">목록을 불러오는 중입니다.</div> : null}
      {!loading && users.length === 0 ? <div className="text-sm text-neutral-400">차단된 유저가 없습니다.</div> : null}
      {users.map((user) => (
        <div key={user.userId} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-neutral-800 bg-neutral-950/40 p-3">
          <div className="min-w-0">
            <div className="truncate text-sm text-neutral-200">{user.userLabel}</div>
            <div className="mt-1 text-xs text-neutral-500">{new Date(user.blockedAt).toLocaleString("ko-KR")}</div>
          </div>
          <button type="button" disabled={Boolean(busyUserId)} onClick={() => void unblock(user.userId)} className="rounded-xl border border-sky-500/40 px-3 py-2 text-sm text-sky-200 disabled:opacity-40">
            차단 해제
          </button>
        </div>
      ))}
    </div>
  );
}

export default memo(BlockedUsersSectionContent);
