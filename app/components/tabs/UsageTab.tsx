"use client";

import { useMemo, useState } from "react";

type UsageBoardTab = {
  key: string;
  label: string;
};

function UsageBoardTabIcon({ tabKey, active }: { tabKey: string; active: boolean }) {
  const stroke = active ? "black" : "#e5e5e5";

  if (tabKey === "home") {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M3 10.5L12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V10.5Z" stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
      </svg>
    );
  }

  if (tabKey === "saved") {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M5 3h12l2 2v16a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
        <path d="M8 3v6h8V3" stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
      </svg>
    );
  }

  if (tabKey === "recommend") {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z" stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
      </svg>
    );
  }

  if (tabKey === "settings") {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" stroke={stroke} strokeWidth="2" />
        <path
          d="M19.4 15a7.9 7.9 0 0 0 .1-6l-2.1.2a6.2 6.2 0 0 0-1.3-1.3l.2-2.1a7.9 7.9 0 0 0-6-.1l.2 2.1a6.2 6.2 0 0 0-1.3 1.3L7 9a7.9 7.9 0 0 0-.1 6l2.1-.2c.4.5.8 1 1.3 1.3l-.2 2.1a7.9 7.9 0 0 0 6 .1l-.2-2.1c.5-.4 1-.8 1.3-1.3l2.2.2Z"
          stroke={stroke}
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return null;
}

type UsagePost = {
  id: string;
  categoryKey: string;
  title: string;
  content: string;
  imagePath: string;
  userId: string | null;
  createdAt: number;
};

type UsageTabProps = {
  tabs: readonly UsageBoardTab[];
  activeTab: string;
  onTabChange: (key: string) => void;
  posts: readonly UsagePost[];
  loadingPosts: boolean;
  isMaster: boolean;
  onSubmitPost: (payload: { categoryKey: string; title: string; content: string; imageFile: File | null }) => Promise<boolean>;
  onDeletePost: (id: string) => Promise<boolean>;
  getPublicUrl: (bucket: "nikke-images" | "boss-images" | "usage-board-images", path: string) => string;
};

export default function UsageTab({
  tabs,
  activeTab,
  onTabChange,
  posts,
  loadingPosts,
  isMaster,
  onSubmitPost,
  onDeletePost,
  getPublicUrl,
}: UsageTabProps) {
  const [showWriteForm, setShowWriteForm] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("ko-KR", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    []
  );

  async function handleSubmit() {
    if (saving || !isMaster) return;

    setSaving(true);
    try {
      const saved = await onSubmitPost({
        categoryKey: activeTab,
        title,
        content,
        imageFile,
      });
      if (!saved) return;
      setTitle("");
      setContent("");
      setImageFile(null);
      setShowWriteForm(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (deletingId) return;

    setDeletingId(id);
    try {
      await onDeletePost(id);
    } finally {
      setDeletingId(null);
    }
  }

  const activeLabel = tabs.find((tab) => tab.key === activeTab)?.label ?? activeTab;

  return (
    <div className="space-y-3">
      <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-neutral-100">사용법 게시판</h2>
            <div className="mt-1 text-sm text-neutral-400">{activeLabel} 관련 사용법과 안내 이미지를 볼 수 있어요.</div>
          </div>

          {isMaster ? (
            <button
              type="button"
              onClick={() => setShowWriteForm((prev) => !prev)}
              className="rounded-2xl border border-neutral-700 px-4 py-2 text-sm text-neutral-100 active:scale-[0.99]"
            >
              {showWriteForm ? "닫기" : "게시글 작성"}
            </button>
          ) : null}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => onTabChange(tab.key)}
              className={`flex min-h-16 items-center gap-2.5 rounded-xl border px-3 py-3 text-left text-base font-semibold transition ${
                activeTab === tab.key
                  ? "border-white bg-white text-black"
                  : "border-neutral-700 bg-neutral-950/40 text-neutral-200 hover:border-neutral-400"
              }`}
            >
              <div className="shrink-0">
                <UsageBoardTabIcon tabKey={tab.key} active={activeTab === tab.key} />
              </div>
              <div className="leading-tight">{tab.label}</div>
            </button>
          ))}
        </div>

        {isMaster ? (
          <div className="mt-3 text-xs text-neutral-500">게시글 작성은 마스터 계정만 가능하고, 이미지는 필수예요.</div>
        ) : null}

        {isMaster && showWriteForm ? (
          <div className="mt-4 space-y-3 rounded-2xl border border-neutral-800 bg-neutral-950/50 p-4">
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={`${activeLabel} 게시글 제목`}
              disabled={saving}
              className="w-full rounded-2xl border border-neutral-800 bg-neutral-950/70 px-4 py-3 text-sm text-neutral-100 outline-none disabled:opacity-60"
            />
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder={`${activeLabel} 사용법을 입력해 주세요.`}
              disabled={saving}
              className="h-36 w-full resize-none rounded-2xl border border-neutral-800 bg-neutral-950/70 px-4 py-3 text-sm text-neutral-100 outline-none disabled:opacity-60"
            />
            <label className="block rounded-2xl border border-dashed border-neutral-700 bg-neutral-950/40 px-4 py-3 text-sm text-neutral-300">
              <div>이미지 업로드</div>
              <input
                type="file"
                accept="image/*"
                disabled={saving}
                onChange={(event) => setImageFile(event.target.files?.[0] ?? null)}
                className="mt-3 block w-full text-xs text-neutral-400 file:mr-3 file:rounded-xl file:border file:border-neutral-700 file:bg-neutral-900 file:px-3 file:py-2 file:text-neutral-200"
              />
              <div className="mt-2 text-xs text-neutral-500">{imageFile ? imageFile.name : "선택된 이미지가 없어요."}</div>
            </label>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={saving}
                className="rounded-2xl border border-neutral-700 px-4 py-3 text-sm text-neutral-100 active:scale-[0.99] disabled:opacity-50"
              >
                {saving ? "저장 중.." : "게시글 저장"}
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <section className="space-y-3">
        {loadingPosts ? (
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4 text-sm text-neutral-400">
            게시글을 불러오는 중..
          </div>
        ) : posts.length === 0 ? (
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4 text-sm text-neutral-400">
            아직 등록된 {activeLabel} 게시글이 없어요.
          </div>
        ) : (
          posts.map((post) => {
            const imageUrl = getPublicUrl("usage-board-images", post.imagePath);

            return (
              <article key={post.id} className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/40">
                <div className="border-b border-neutral-800 px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-neutral-100">{post.title}</h3>
                      <div className="mt-1 text-xs text-neutral-500">{dateFormatter.format(new Date(post.createdAt))}</div>
                    </div>

                    {isMaster ? (
                      <button
                        type="button"
                        onClick={() => void handleDelete(post.id)}
                        disabled={deletingId === post.id}
                        className="rounded-xl border border-red-800/70 px-3 py-2 text-xs text-red-300 active:scale-[0.99] disabled:opacity-50"
                      >
                        {deletingId === post.id ? "삭제 중.." : "삭제"}
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="bg-black/20">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageUrl} alt={post.title} className="h-auto w-full object-cover" />
                </div>

                <div className="px-4 py-4">
                  <div className="whitespace-pre-wrap text-sm leading-6 text-neutral-200">{post.content}</div>
                </div>
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}
