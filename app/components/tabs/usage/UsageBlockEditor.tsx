"use client";

import { useEffect, useRef } from "react";
import ImageUploadField from "./ImageUploadField";
import type { UsageEditorBlock, UsageTextFontSize } from "./types";

type UsageBlockEditorProps = {
  block: UsageEditorBlock;
  index: number;
  total: number;
  disabled?: boolean;
  onChange: (block: UsageEditorBlock) => void;
  onInsertTextBelow: () => void;
  onInsertImageBelow: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
};

const textAreaClassBySize: Record<UsageTextFontSize, string> = {
  sm: "text-sm leading-6",
  md: "text-base leading-7",
  lg: "text-lg leading-8",
};

export default function UsageBlockEditor({
  block,
  index,
  total,
  disabled,
  onChange,
  onInsertTextBelow,
  onInsertImageBelow,
  onMoveUp,
  onMoveDown,
  onDelete,
}: UsageBlockEditorProps) {
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (block.type !== "text" || !textAreaRef.current) return;
    textAreaRef.current.style.height = "0px";
    textAreaRef.current.style.height = `${textAreaRef.current.scrollHeight}px`;
  }, [block]);

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-950/50 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
          {block.type === "text" ? "Text Block" : "Image Block"} {index + 1}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onInsertTextBelow}
            disabled={disabled}
            className="rounded-xl border border-neutral-700 px-3 py-2 text-xs text-neutral-200 disabled:opacity-40"
          >
            텍스트 추가
          </button>
          <button
            type="button"
            onClick={onInsertImageBelow}
            disabled={disabled}
            className="rounded-xl border border-neutral-700 px-3 py-2 text-xs text-neutral-200 disabled:opacity-40"
          >
            이미지 추가
          </button>
          <button
            type="button"
            onClick={onMoveUp}
            disabled={disabled || index === 0}
            className="rounded-xl border border-neutral-700 px-3 py-2 text-xs text-neutral-200 disabled:opacity-40"
          >
            위로
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={disabled || index === total - 1}
            className="rounded-xl border border-neutral-700 px-3 py-2 text-xs text-neutral-200 disabled:opacity-40"
          >
            아래로
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={disabled}
            className="rounded-xl border border-red-800/70 px-3 py-2 text-xs text-red-300 disabled:opacity-40"
          >
            삭제
          </button>
        </div>
      </div>

      {block.type === "text" ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-xs text-neutral-500">폰트 크기</div>
            {(["sm", "md", "lg"] as const).map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => onChange({ ...block, fontSize: size })}
                disabled={disabled}
                className={`rounded-xl border px-3 py-2 text-xs disabled:opacity-40 ${
                  block.fontSize === size
                    ? "border-white bg-white text-black"
                    : "border-neutral-700 text-neutral-200"
                }`}
              >
                {size === "sm" ? "작게" : size === "md" ? "보통" : "크게"}
              </button>
            ))}
          </div>

          <textarea
            ref={textAreaRef}
            value={block.content}
            onChange={(event) => onChange({ ...block, content: event.target.value })}
            placeholder="설명 문장을 입력해 주세요."
            disabled={disabled}
            rows={3}
            className={`w-full resize-none overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950/70 px-4 py-3 text-neutral-100 outline-none disabled:opacity-60 ${textAreaClassBySize[block.fontSize]}`}
          />
        </div>
      ) : (
        <div className="space-y-3">
          <ImageUploadField
            disabled={disabled}
            onChange={(file) => {
              if (!file) return;
              const previewUrl = URL.createObjectURL(file);
              onChange({
                ...block,
                file,
                previewUrl,
              });
            }}
          />

          {block.previewUrl ? (
            <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-black/20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={block.previewUrl} alt="업로드 미리보기" className="h-auto w-full object-cover" />
            </div>
          ) : (
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4 text-sm text-neutral-500">
              아직 선택된 이미지가 없어요.
            </div>
          )}

          <input
            value={block.caption}
            onChange={(event) => onChange({ ...block, caption: event.target.value })}
            placeholder="이미지 캡션 (선택)"
            disabled={disabled}
            className="w-full rounded-2xl border border-neutral-800 bg-neutral-950/70 px-4 py-3 text-sm text-neutral-100 outline-none disabled:opacity-60"
          />

          {block.isUploading ? <div className="text-xs text-neutral-500">이미지 업로드 중..</div> : null}
        </div>
      )}
    </div>
  );
}
