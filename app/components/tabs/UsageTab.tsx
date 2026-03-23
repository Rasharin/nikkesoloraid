"use client";

import { useEffect, useMemo, useState } from "react";
import UsagePostEditor from "./usage/UsagePostEditor";
import UsagePostViewer from "./usage/UsagePostViewer";
import type { UsageEditorBlock, UsagePost, UsagePostSubmitPayload } from "./usage/types";

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

type UsageTabProps = {
  tabs: readonly UsageBoardTab[];
  activeTab: string;
  onTabChange: (key: string) => void;
  posts: readonly UsagePost[];
  loadingPosts: boolean;
  isMaster: boolean;
  savingPost: boolean;
  deletingPostId: string | null;
  onSubmitPost: (payload: UsagePostSubmitPayload) => Promise<boolean>;
  onDeletePost: (id: string) => Promise<boolean>;
  getPublicUrl: (bucket: "nikke-images" | "boss-images" | "usage-board-images", path: string) => string;
};

function createDefaultTextBlock(): UsageEditorBlock {
  return {
    id: `text-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: "text",
    content: "",
  };
}

function toEditorBlocks(post: UsagePost | null, getPublicUrl: UsageTabProps["getPublicUrl"]): UsageEditorBlock[] {
  if (!post) return [createDefaultTextBlock()];

  return post.blocks.map((block) =>
    block.type === "text"
      ? { ...block }
      : {
          ...block,
          file: null,
          previewUrl: getPublicUrl("usage-board-images", block.imagePath),
          isUploading: false,
        }
  );
}

export default function UsageTab({
  tabs,
  activeTab,
  onTabChange,
  posts,
  loadingPosts,
  isMaster,
  savingPost,
  deletingPostId,
  onSubmitPost,
  onDeletePost,
  getPublicUrl,
}: UsageTabProps) {
  const [showWriteForm, setShowWriteForm] = useState(false);
  const [blocks, setBlocks] = useState<UsageEditorBlock[]>([createDefaultTextBlock()]);

  const activeLabel = tabs.find((tab) => tab.key === activeTab)?.label ?? activeTab;
  const currentPost = posts[0] ?? null;

  useEffect(() => {
    setShowWriteForm(false);
  }, [activeTab]);

  useEffect(() => {
    if (!showWriteForm) return;
    setBlocks(toEditorBlocks(currentPost, getPublicUrl));
  }, [currentPost, getPublicUrl, showWriteForm]);

  const hasContent = useMemo(
    () =>
      blocks.some((block) =>
        block.type === "text" ? block.content.trim().length > 0 : Boolean(block.previewUrl || block.imagePath || block.file)
      ),
    [blocks]
  );

  async function handleSubmit(payload: UsagePostSubmitPayload) {
    const uploadingBlocks = payload.blocks.map((block) =>
      block.type === "image" && block.file ? { ...block, isUploading: true } : block
    );
    setBlocks(uploadingBlocks);

    const saved = await onSubmitPost({
      ...payload,
      blocks: uploadingBlocks,
    });

    setBlocks((prev) => prev.map((block) => (block.type === "image" ? { ...block, isUploading: false } : block)));
    if (!saved) return;
    setShowWriteForm(false);
  }

  return (
    <div className="space-y-3">
      <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-neutral-100">니케 도우미 사용법</h2>
          </div>

          {isMaster ? (
            <button
              type="button"
              onClick={() => {
                const nextOpen = !showWriteForm;
                setShowWriteForm(nextOpen);
                if (nextOpen) {
                  setBlocks(toEditorBlocks(currentPost, getPublicUrl));
                }
              }}
              className="rounded-2xl border border-neutral-700 px-4 py-2 text-sm text-neutral-100 active:scale-[0.99]"
            >
              {showWriteForm ? "닫기" : currentPost ? "사용법 수정" : "사용법 작성"}
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

        {isMaster && showWriteForm ? (
          <UsagePostEditor
            blocks={blocks}
            activeLabel={activeLabel}
            currentPost={currentPost}
            saving={savingPost}
            onBlocksChange={setBlocks}
            onSubmit={handleSubmit}
            categoryKey={activeTab}
          />
        ) : null}
      </section>

      <section className="space-y-3">
        {loadingPosts ? (
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4 text-sm text-neutral-400">
            게시글을 불러오는 중..
          </div>
        ) : !currentPost ? (
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4 text-sm text-neutral-400">
            아직 등록된 {activeLabel} 사용법이 없어요.
            {isMaster && !showWriteForm && !hasContent ? " 작성 버튼으로 첫 블록 글을 만들 수 있어요." : ""}
          </div>
        ) : (
          <UsagePostViewer
            post={currentPost}
            isMaster={isMaster}
            deleting={deletingPostId === currentPost.id}
            getPublicUrl={getPublicUrl}
            onDelete={() => void onDeletePost(currentPost.id)}
          />
        )}
      </section>
    </div>
  );
}
