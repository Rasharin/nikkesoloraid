"use client";

import { useEffect, useState } from "react";

export type NoticePost = {
  id: string;
  title: string;
  content: string;
  userId: string | null;
  createdAt: number;
  updatedAt: number;
};

type NoticeContentProps = {
  posts: readonly NoticePost[];
  loading: boolean;
  isMaster: boolean;
  saving: boolean;
  deletingId: string | null;
  onSubmit: (payload: { id?: string; title: string; content: string }) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
};

const emptyDraft = { title: "", content: "" };

export default function NoticeContent({ posts, loading, isMaster, saving, deletingId, onSubmit, onDelete }: NoticeContentProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  useEffect(() => {
    setOpenIds((current) => {
      const postIds = new Set(posts.map((post) => post.id));
      const next = new Set([...current].filter((id) => postIds.has(id)));
      if (next.size === 0 && posts[0]) {
        next.add(posts[0].id);
      }
      return next;
    });
  }, [posts]);

  function startCreate() {
    setEditingId("new");
    setDraft(emptyDraft);
  }

  function startEdit(post: NoticePost) {
    setEditingId(post.id);
    setDraft({ title: post.title, content: post.content });
    setOpenIds((current) => new Set(current).add(post.id));
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft(emptyDraft);
  }

  async function handleSubmit() {
    const saved = await onSubmit({
      id: editingId && editingId !== "new" ? editingId : undefined,
      title: draft.title,
      content: draft.content,
    });
    if (!saved) return;
    cancelEdit();
  }

  function toggleOpen(id: string) {
    setOpenIds((current) => {
      const next = new Set(current);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <section className="mx-auto w-full max-w-4xl space-y-4">
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/80 p-5 shadow-2xl sm:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-neutral-100">공지사항</h2>
            <div className="mt-1 text-sm text-neutral-400">서비스 운영 안내와 업데이트 소식을 확인할 수 있습니다.</div>
          </div>
          {isMaster ? (
            <button
              type="button"
              onClick={editingId ? cancelEdit : startCreate}
              className="rounded-2xl border border-neutral-700 px-4 py-2 text-sm text-neutral-200 active:scale-[0.99]"
            >
              {editingId ? "닫기" : "공지 작성"}
            </button>
          ) : null}
        </div>

        {isMaster && editingId ? (
          <div className="mt-5 space-y-3 rounded-2xl border border-neutral-800 bg-neutral-950/50 p-4">
            <input
              value={draft.title}
              onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
              placeholder="제목"
              className="w-full rounded-2xl border border-neutral-800 bg-neutral-950/70 px-4 py-3 text-sm text-neutral-100 outline-none focus:border-neutral-500"
            />
            <textarea
              value={draft.content}
              onChange={(event) => setDraft((current) => ({ ...current, content: event.target.value }))}
              placeholder="공지 내용을 입력하세요"
              className="min-h-60 w-full resize-y rounded-2xl border border-neutral-800 bg-neutral-950/70 px-4 py-3 text-sm leading-7 text-neutral-100 outline-none focus:border-neutral-500"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={cancelEdit}
                disabled={saving}
                className="rounded-2xl border border-neutral-700 px-4 py-2 text-sm text-neutral-200 disabled:opacity-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={saving}
                className="rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
              >
                {saving ? "저장 중..." : "저장"}
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {loading ? (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/80 p-5 text-sm text-neutral-400">공지사항을 불러오는 중...</div>
      ) : posts.length === 0 ? (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/80 p-5 text-sm text-neutral-400">등록된 공지사항이 없습니다.</div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => {
            const isOpen = openIds.has(post.id);
            return (
              <article key={post.id} className="rounded-2xl border border-neutral-800 bg-neutral-900/80">
                <button
                  type="button"
                  onClick={() => toggleOpen(post.id)}
                  className="flex w-full flex-col gap-2 px-5 py-4 text-left sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <h3 className="break-words text-base font-semibold text-neutral-100">{post.title}</h3>
                    <div className="mt-1 text-xs text-neutral-500">
                      {dateFormatter.format(new Date(post.updatedAt || post.createdAt))}
                    </div>
                  </div>
                  <span className="shrink-0 text-sm text-neutral-400">{isOpen ? "닫기" : "보기"}</span>
                </button>

                {isOpen ? (
                  <div className="border-t border-neutral-800 px-5 py-4">
                    <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-7 text-neutral-300">{post.content}</pre>
                    {isMaster ? (
                      <div className="mt-4 flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(post)}
                          className="rounded-2xl border border-neutral-700 px-4 py-2 text-sm text-neutral-200"
                        >
                          수정
                        </button>
                        <button
                          type="button"
                          onClick={() => void onDelete(post.id)}
                          disabled={deletingId === post.id}
                          className="rounded-2xl border border-red-800/70 px-4 py-2 text-sm text-red-300 disabled:opacity-50"
                        >
                          {deletingId === post.id ? "삭제 중..." : "삭제"}
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
