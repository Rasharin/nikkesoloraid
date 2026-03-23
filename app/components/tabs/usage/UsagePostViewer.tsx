"use client";

import type { UsagePost } from "./types";

type UsagePostViewerProps = {
  post: UsagePost;
  isMaster: boolean;
  deleting: boolean;
  getPublicUrl: (bucket: "nikke-images" | "boss-images" | "usage-board-images", path: string) => string;
  onDelete: () => void;
};

export default function UsagePostViewer({ post, isMaster, deleting, getPublicUrl, onDelete }: UsagePostViewerProps) {
  const dateText = new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(post.updatedAt || post.createdAt));

  return (
    <article className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/40">
      <div className="border-b border-neutral-800 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-neutral-100">{post.title}</h3>
            <div className="mt-1 text-xs text-neutral-500">{dateText}</div>
          </div>

          {isMaster ? (
            <button
              type="button"
              onClick={onDelete}
              disabled={deleting}
              className="rounded-xl border border-red-800/70 px-3 py-2 text-xs text-red-300 disabled:opacity-50"
            >
              {deleting ? "삭제 중.." : "삭제"}
            </button>
          ) : null}
        </div>
      </div>

      <div className="space-y-5 px-4 py-5 sm:px-5">
        {post.blocks.map((block) =>
          block.type === "text" ? (
            <div key={block.id} className="whitespace-pre-wrap text-sm leading-7 text-neutral-200">
              {block.content}
            </div>
          ) : (
            <figure key={block.id} className="space-y-2">
              <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-black/20">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getPublicUrl("usage-board-images", block.imagePath)}
                  alt={block.caption || post.title}
                  className="h-auto max-w-full object-cover"
                />
              </div>
              {block.caption ? <figcaption className="text-center text-xs text-neutral-500">{block.caption}</figcaption> : null}
            </figure>
          )
        )}
      </div>
    </article>
  );
}
