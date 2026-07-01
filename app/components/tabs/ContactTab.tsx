"use client";

import { memo, useState } from "react";
import {
  CONTACT_STATUS_LABELS,
  CONTACT_VISIBILITY_LABELS,
  type ContactPostDetail,
  type ContactPostStatus,
  type ContactPostSummary,
  type ContactPostVisibility,
} from "../../../lib/contact-board";

type ContactTabProps = {
  posts: ContactPostSummary[];
  loading: boolean;
  refreshing?: boolean;
  isMaster: boolean;
  setupRequired: boolean;
  onCreatePost: (payload: {
    title: string;
    content: string;
    visibility: ContactPostVisibility;
    password: string;
  }) => Promise<boolean>;
  onOpenPost: (id: string, password?: string) => Promise<ContactPostDetail | null>;
  onUpdatePost: (
    id: string,
    payload: {
      replyContent?: string;
      visibility?: ContactPostVisibility;
      status?: ContactPostStatus;
    }
  ) => Promise<ContactPostDetail | null>;
  onDeletePost: (id: string) => Promise<boolean>;
};

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

function statusClass(status: ContactPostStatus) {
  return status === "resolved"
    ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-200"
    : "border-amber-500/50 bg-amber-500/10 text-amber-200 light:text-black";
}

function ContactTab({
  posts,
  loading,
  refreshing = false,
  isMaster,
  setupRequired,
  onCreatePost,
  onOpenPost,
  onUpdatePost,
  onDeletePost,
}: ContactTabProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [visibility, setVisibility] = useState<ContactPostVisibility>("private");
  const [password, setPassword] = useState("");
  const [showWriteForm, setShowWriteForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, ContactPostDetail>>({});
  const [passwordInputs, setPasswordInputs] = useState<Record<string, string>>({});
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [busyPostId, setBusyPostId] = useState<string | null>(null);

  async function handleCreate() {
    if (saving) return;
    setSaving(true);
    try {
      const saved = await onCreatePost({ title, content, visibility, password });
      if (!saved) return;
      setTitle("");
      setContent("");
      setPassword("");
      setVisibility("private");
      setShowWriteForm(false);
    } finally {
      setSaving(false);
    }
  }

  async function openPost(post: ContactPostSummary, passwordOverride?: string) {
    if (busyPostId) return;
    setOpenId(post.id);

    if (!post.canOpen && post.visibility === "private" && !passwordOverride) {
      return;
    }

    setBusyPostId(post.id);
    try {
      const detail = await onOpenPost(post.id, passwordOverride);
      if (!detail) return;
      setDetails((prev) => ({ ...prev, [post.id]: detail }));
      setReplyDrafts((prev) => ({ ...prev, [post.id]: detail.replyContent ?? "" }));
    } finally {
      setBusyPostId(null);
    }
  }

  async function togglePost(post: ContactPostSummary) {
    if (openId === post.id) {
      setOpenId(null);
      return;
    }
    await openPost(post);
  }

  async function handlePasswordOpen(post: ContactPostSummary) {
    await openPost(post, passwordInputs[post.id] ?? "");
  }

  async function handleUpdate(
    post: ContactPostSummary,
    payload: {
      replyContent?: string;
      visibility?: ContactPostVisibility;
      status?: ContactPostStatus;
    }
  ) {
    if (busyPostId) return;
    setBusyPostId(post.id);
    try {
      const detail = await onUpdatePost(post.id, payload);
      if (!detail) return;
      setDetails((prev) => ({ ...prev, [post.id]: detail }));
      setReplyDrafts((prev) => ({ ...prev, [post.id]: detail.replyContent ?? "" }));
    } finally {
      setBusyPostId(null);
    }
  }

  async function handleDelete(post: ContactPostSummary) {
    if (busyPostId) return;
    setBusyPostId(post.id);
    try {
      const deleted = await onDeletePost(post.id);
      if (!deleted) return;
      setOpenId((prev) => (prev === post.id ? null : prev));
      setDetails((prev) => {
        const next = { ...prev };
        delete next[post.id];
        return next;
      });
    } finally {
      setBusyPostId(null);
    }
  }

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">문의 게시판</h2>
          <div className="flex items-center gap-3">
            {refreshing && !loading ? <span className="text-xs text-neutral-500">새로고침 중...</span> : null}
            <button
              type="button"
              onClick={() => setShowWriteForm((prev) => !prev)}
              className="rounded-2xl border border-neutral-700 px-4 py-2 text-sm active:scale-[0.99]"
            >
              {showWriteForm ? "닫기" : "문의하기"}
            </button>
          </div>
        </div>

        {showWriteForm ? (
          <div className="mt-4 grid gap-3 rounded-2xl border border-neutral-700 bg-neutral-800/70 p-4">
            <div className="flex items-center gap-3">
              <div className="flex gap-2">
                {(["private", "public"] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setVisibility(item)}
                    disabled={saving}
                    className={
                      visibility === item
                        ? "rounded-2xl border border-white bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-60"
                        : "rounded-2xl border border-neutral-600 bg-neutral-900/40 px-4 py-2 text-sm text-neutral-100 disabled:opacity-60"
                    }
                  >
                    {CONTACT_VISIBILITY_LABELS[item]}
                  </button>
                ))}
              </div>
            </div>

            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="문의 제목"
              disabled={saving}
              className="w-full rounded-2xl border border-neutral-700 bg-neutral-950/60 px-4 py-3 text-sm outline-none disabled:opacity-60"
            />
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="수정 요청, 기능 추가 요청, UI 개선 의견, 버그 제보"
              disabled={saving}
              className="h-36 w-full resize-none rounded-2xl border border-neutral-700 bg-neutral-950/60 px-4 py-3 text-sm outline-none disabled:opacity-60"
            />

            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
              {visibility === "private" ? (
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type="password"
                  placeholder="비공개 글 조회 비밀번호"
                  disabled={saving}
                  className="w-full rounded-2xl border border-neutral-700 bg-neutral-950/60 px-4 py-3 text-sm outline-none disabled:opacity-60 lg:max-w-[33%]"
                />
              ) : (
                <div className="text-xs text-neutral-400">공개 글은 모든 사용자가 내용과 답글을 볼 수 있습니다.</div>
              )}

              <button
                type="button"
                onClick={() => void handleCreate()}
                disabled={saving}
                className="rounded-2xl border border-neutral-700 px-4 py-3 text-sm active:scale-[0.99] disabled:opacity-50"
              >
                {saving ? "등록 중..." : "문의 등록"}
              </button>
            </div>
          </div>
        ) : null}

        <div className="mt-3 divide-y divide-neutral-800 overflow-hidden rounded-2xl border border-neutral-800">
          {loading ? (
            <div className="bg-neutral-950/40 p-4 text-sm text-neutral-400">문의 글을 불러오는 중...</div>
          ) : setupRequired || posts.length === 0 ? (
            <div className="bg-neutral-950/40 p-4 text-sm text-neutral-400">아직 등록된 문의가 없습니다.</div>
          ) : (
            posts.map((post) => {
              const detail = details[post.id];
              const isOpen = openId === post.id;
              const locked = isOpen && post.visibility === "private" && !detail;
              return (
                <article key={post.id} className="bg-neutral-950/40">
                  <button
                    type="button"
                    onClick={() => void togglePost(post)}
                    className="grid w-full grid-cols-[1fr_auto] items-center gap-3 px-4 py-3 text-left active:scale-[0.999]"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-medium text-neutral-100">{post.title}</span>
                        <span className="rounded-full border border-neutral-700 px-2 py-0.5 text-[11px] text-neutral-300">
                          {CONTACT_VISIBILITY_LABELS[post.visibility]}
                        </span>
                        {post.hasReply ? (
                          <span className="rounded-full border border-sky-500/50 bg-sky-500/10 px-2 py-0.5 text-[11px] text-sky-200">
                            답변완료
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-1 text-xs text-neutral-500">{dateFormatter.format(new Date(post.createdAt))}</div>
                    </div>
                    <span className={`shrink-0 rounded-full border px-3 py-1 text-xs ${statusClass(post.status)}`}>
                      {CONTACT_STATUS_LABELS[post.status]}
                    </span>
                  </button>

                  {isOpen ? (
                    <div className="border-t border-neutral-800 px-4 py-4">
                      {busyPostId === post.id && !detail ? (
                        <div className="text-sm text-neutral-400">문의 글을 여는 중...</div>
                      ) : locked ? (
                        <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
                          <input
                            value={passwordInputs[post.id] ?? ""}
                            onChange={(event) =>
                              setPasswordInputs((prev) => ({ ...prev, [post.id]: event.target.value }))
                            }
                            type="password"
                            placeholder="비공개 글 조회 비밀번호"
                            className="w-full rounded-2xl border border-neutral-800 bg-neutral-950/60 px-4 py-3 text-sm outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => void handlePasswordOpen(post)}
                            disabled={busyPostId === post.id}
                            className="rounded-2xl border border-neutral-700 px-4 py-3 text-sm active:scale-[0.99] disabled:opacity-50"
                          >
                            확인
                          </button>
                        </div>
                      ) : detail ? (
                        <div className="space-y-4">
                          <div className="whitespace-pre-wrap text-sm leading-6 text-neutral-200">{detail.content}</div>

                          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-4">
                            <div className="mb-2 text-xs font-medium text-neutral-400">마스터 답글</div>
                            {detail.replyContent ? (
                              <div className="whitespace-pre-wrap text-sm leading-6 text-neutral-100">{detail.replyContent}</div>
                            ) : (
                              <div className="text-sm text-neutral-500">아직 답글이 없습니다.</div>
                            )}
                          </div>

                          {isMaster ? (
                            <div className="space-y-3 rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4">
                              <textarea
                                value={replyDrafts[post.id] ?? ""}
                                onChange={(event) =>
                                  setReplyDrafts((prev) => ({ ...prev, [post.id]: event.target.value }))
                                }
                                placeholder="마스터 답글"
                                className="h-28 w-full resize-none rounded-2xl border border-neutral-800 bg-neutral-950/60 px-4 py-3 text-sm outline-none"
                              />
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => void handleUpdate(post, { replyContent: replyDrafts[post.id] ?? "", status: "resolved" })}
                                  disabled={busyPostId === post.id}
                                  className="rounded-2xl border border-neutral-700 px-4 py-2 text-sm active:scale-[0.99] disabled:opacity-50"
                                >
                                  답글 저장
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    void handleUpdate(post, {
                                      status: detail.status === "resolved" ? "received" : "resolved",
                                    })
                                  }
                                  disabled={busyPostId === post.id}
                                  className="rounded-2xl border border-neutral-700 px-4 py-2 text-sm active:scale-[0.99] disabled:opacity-50"
                                >
                                  {detail.status === "resolved" ? "접수중으로 변경" : "해결완료로 변경"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    void handleUpdate(post, {
                                      visibility: detail.visibility === "public" ? "private" : "public",
                                    })
                                  }
                                  disabled={busyPostId === post.id}
                                  className="rounded-2xl border border-neutral-700 px-4 py-2 text-sm active:scale-[0.99] disabled:opacity-50"
                                >
                                  {detail.visibility === "public" ? "비공개 전환" : "공개 전환"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handleDelete(post)}
                                  disabled={busyPostId === post.id}
                                  className="rounded-2xl border border-red-800/70 px-4 py-2 text-sm text-red-300 active:scale-[0.99] disabled:opacity-50"
                                >
                                  삭제
                                </button>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </article>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}

export default memo(ContactTab);
