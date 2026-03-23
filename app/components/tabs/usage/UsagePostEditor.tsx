"use client";

import UsageBlockEditor from "./UsageBlockEditor";
import type { UsageEditorBlock, UsagePost, UsagePostSubmitPayload } from "./types";

type UsagePostEditorProps = {
  blocks: UsageEditorBlock[];
  activeLabel: string;
  currentPost: UsagePost | null;
  saving: boolean;
  onBlocksChange: (blocks: UsageEditorBlock[]) => void;
  onSubmit: (payload: UsagePostSubmitPayload) => Promise<void>;
  categoryKey: string;
};

function createTextBlock(): UsageEditorBlock {
  return {
    id: `text-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: "text",
    content: "",
    fontSize: "md",
  };
}

function createImageBlock(): UsageEditorBlock {
  return {
    id: `image-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: "image",
    imagePath: "",
    caption: "",
    file: null,
    previewUrl: "",
    isUploading: false,
  };
}

function insertAfter(blocks: UsageEditorBlock[], index: number, block: UsageEditorBlock) {
  const nextBlocks = [...blocks];
  nextBlocks.splice(index + 1, 0, block);
  return nextBlocks;
}

export default function UsagePostEditor({
  blocks,
  activeLabel,
  currentPost,
  saving,
  onBlocksChange,
  onSubmit,
  categoryKey,
}: UsagePostEditorProps) {
  function updateBlock(nextBlock: UsageEditorBlock) {
    onBlocksChange(blocks.map((block) => (block.id === nextBlock.id ? nextBlock : block)));
  }

  function moveBlock(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= blocks.length) return;

    const nextBlocks = [...blocks];
    const [picked] = nextBlocks.splice(index, 1);
    nextBlocks.splice(targetIndex, 0, picked);
    onBlocksChange(nextBlocks);
  }

  function removeBlock(id: string) {
    const nextBlocks = blocks.filter((block) => block.id !== id);
    onBlocksChange(nextBlocks.length > 0 ? nextBlocks : [createTextBlock()]);
  }

  async function handleSubmit() {
    await onSubmit({
      categoryKey,
      blocks,
    });
  }

  return (
    <div className="mt-4 space-y-4 rounded-2xl border border-neutral-800 bg-neutral-950/50 p-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onBlocksChange([...blocks, createTextBlock()])}
          disabled={saving}
          className="rounded-xl border border-neutral-700 px-3 py-2 text-sm text-neutral-200 disabled:opacity-50"
        >
          텍스트 추가
        </button>
        <button
          type="button"
          onClick={() => onBlocksChange([...blocks, createImageBlock()])}
          disabled={saving}
          className="rounded-xl border border-neutral-700 px-3 py-2 text-sm text-neutral-200 disabled:opacity-50"
        >
          이미지 추가
        </button>
      </div>

      <div className="space-y-3">
        {blocks.map((block, index) => (
          <UsageBlockEditor
            key={block.id}
            block={block}
            index={index}
            total={blocks.length}
            disabled={saving}
            onChange={updateBlock}
            onInsertTextBelow={() => onBlocksChange(insertAfter(blocks, index, createTextBlock()))}
            onInsertImageBelow={() => onBlocksChange(insertAfter(blocks, index, createImageBlock()))}
            onMoveUp={() => moveBlock(index, -1)}
            onMoveDown={() => moveBlock(index, 1)}
            onDelete={() => removeBlock(block.id)}
          />
        ))}
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="text-xs text-neutral-500">
          {currentPost ? `${activeLabel} 사용법을 이어서 수정하고 있어요.` : "기본 텍스트 블록 1개로 시작해요."}
        </div>
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={saving}
          className="rounded-2xl border border-neutral-700 px-4 py-3 text-sm text-neutral-100 disabled:opacity-50"
        >
          {saving ? "저장 중.." : currentPost ? "사용법 업데이트" : "사용법 저장"}
        </button>
      </div>
    </div>
  );
}
