"use client";

import Image from "next/image";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMemo, useState, type CSSProperties } from "react";
import {
  clearTierAssignments,
  createDefaultTierBoard,
  getContrastingTextColor,
  moveNikke,
  removeNikkeFromTier,
  type TierBoardData,
  type TierRow,
} from "../../../../lib/nikke-tier";
import { formatNikkeDisplayName } from "../../../../lib/nikke-display";
import TierNikkeCatalog, {
  type TierFilterOption,
  type TierNikkeRow,
} from "./TierNikkeCatalog";
import TierSettingsPanel from "./TierSettingsPanel";

type DragData = {
  source?: "catalog" | "tier";
  nikkeName?: string;
  rowId?: string;
  index?: number;
};

type TierBoardProps = {
  board: TierBoardData;
  nikkes: TierNikkeRow[];
  canEdit: boolean;
  saving: boolean;
  onChange: (board: TierBoardData) => void;
  getPublicUrl: (bucket: "nikke-images" | "boss-images", path: string) => string;
  bursts: readonly { readonly n: number; readonly label: string }[];
  elements: readonly TierFilterOption[];
  roles: readonly TierFilterOption[];
};

function EditableLabel({
  value,
  canEdit,
  onChange,
  className = "",
}: {
  value: string;
  canEdit: boolean;
  onChange: (value: string) => void;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  function finish() {
    const nextValue = draft.trim();
    if (nextValue) onChange(nextValue);
    else setDraft(value);
    setEditing(false);
  }

  if (editing && canEdit) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={finish}
        onKeyDown={(event) => {
          if (event.key === "Enter") finish();
          if (event.key === "Escape") {
            setDraft(value);
            setEditing(false);
          }
        }}
        className={`min-w-0 rounded-lg border border-white/50 bg-black/20 px-2 py-1 text-inherit outline-none ${className}`}
      />
    );
  }

  return (
    <span
      onDoubleClick={() => {
        if (!canEdit) return;
        setDraft(value);
        setEditing(true);
      }}
      title={canEdit ? "더블클릭하여 수정" : undefined}
      className={`${canEdit ? "cursor-text" : ""} ${className}`}
    >
      {value}
    </span>
  );
}

function TierNikkeCard({
  nikke,
  rowId,
  index,
  canEdit,
  onRemove,
  getPublicUrl,
}: {
  nikke: TierNikkeRow;
  rowId: string;
  index: number;
  canEdit: boolean;
  onRemove: () => void;
  getPublicUrl: TierBoardProps["getPublicUrl"];
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `tier-card-${rowId}-${nikke.name}`,
    disabled: !canEdit,
    data: { source: "tier", nikkeName: nikke.name, rowId, index } satisfies DragData,
  });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.25 : 1,
  };
  const imageUrl = nikke.image_path ? getPublicUrl("nikke-images", nikke.image_path) : "";

  return (
    <button
      ref={setNodeRef}
      type="button"
      disabled={!canEdit}
      onClick={onRemove}
      style={style}
      {...(canEdit ? attributes : {})}
      {...(canEdit ? listeners : {})}
      className={`w-16 shrink-0 overflow-hidden rounded-xl border border-white/15 bg-black/25 sm:w-20 ${
        canEdit ? "cursor-grab active:cursor-grabbing" : "cursor-default"
      }`}
    >
      <div className="relative aspect-square w-full">
        {imageUrl ? (
          <Image
            fill
            src={imageUrl}
            alt={formatNikkeDisplayName(nikke.name)}
            className="object-cover"
            sizes="80px"
          />
        ) : (
          <div className="grid h-full place-items-center text-[9px] text-white/60">no image</div>
        )}
      </div>
      <div className="truncate px-1 py-1 text-[10px] text-white">
        {formatNikkeDisplayName(nikke.name)}
      </div>
    </button>
  );
}

function TierRowView({
  row,
  nikkesByName,
  canEdit,
  onNameChange,
  onRemoveNikke,
  getPublicUrl,
}: {
  row: TierRow;
  nikkesByName: ReadonlyMap<string, TierNikkeRow>;
  canEdit: boolean;
  onNameChange: (name: string) => void;
  onRemoveNikke: (name: string) => void;
  getPublicUrl: TierBoardProps["getPublicUrl"];
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `tier-row-${row.id}`,
    disabled: !canEdit,
    data: { rowId: row.id },
  });

  return (
    <div
      className="grid min-h-24 grid-cols-[4.5rem_minmax(0,1fr)] overflow-hidden rounded-2xl border sm:grid-cols-[6rem_minmax(0,1fr)]"
      style={{
        borderColor: `${row.color}99`,
        backgroundColor: `${row.color}18`,
        boxShadow: isOver ? `0 0 0 2px ${row.color}` : undefined,
      }}
    >
      <div
        data-tier-row-label
        className="grid min-w-0 place-items-center overflow-hidden border-r border-black/10 p-2 text-center text-lg font-black sm:text-xl"
        style={{ backgroundColor: row.color, color: getContrastingTextColor(row.color) }}
      >
        <EditableLabel
          value={row.name}
          canEdit={canEdit}
          onChange={onNameChange}
          className="w-full max-w-full text-center"
        />
      </div>

      <div ref={setNodeRef} data-tier-row-content className="min-w-0 p-2.5">
        <SortableContext
          items={row.nikkeNames.map((name) => `tier-card-${row.id}-${name}`)}
          strategy={rectSortingStrategy}
        >
          <div className="flex min-h-20 flex-wrap content-start gap-2">
            {row.nikkeNames.map((name, index) => {
              const nikke = nikkesByName.get(name);
              return nikke ? (
                <TierNikkeCard
                  key={name}
                  nikke={nikke}
                  rowId={row.id}
                  index={index}
                  canEdit={canEdit}
                  onRemove={() => onRemoveNikke(name)}
                  getPublicUrl={getPublicUrl}
                />
              ) : null;
            })}
            {row.nikkeNames.length === 0 ? (
              <div className="grid min-h-20 flex-1 place-items-center rounded-xl border border-dashed border-white/15 text-xs text-[var(--muted)]">
              </div>
            ) : null}
          </div>
        </SortableContext>
      </div>

    </div>
  );
}

export default function TierBoard({
  board,
  nikkes,
  canEdit,
  saving,
  onChange,
  getPublicUrl,
  bursts,
  elements,
  roles,
}: TierBoardProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const nikkesByName = useMemo(
    () => new Map(nikkes.map((nikke) => [nikke.name, nikke])),
    [nikkes]
  );
  const assignedTiers = useMemo(() => {
    const map = new Map<string, string>();
    board.rows.forEach((row) => row.nikkeNames.forEach((name) => map.set(name, row.name)));
    return map;
  }, [board.rows]);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function updateRows(rows: TierRow[]) {
    onChange({ ...board, rows });
  }

  function handleDragEnd(event: DragEndEvent) {
    if (!canEdit || !event.over) return;
    const activeData = (event.active.data.current ?? {}) as DragData;
    const overData = (event.over.data.current ?? {}) as DragData & { rowId?: string };
    const nikkeName = activeData.nikkeName;
    const targetRowId =
      overData.rowId ??
      (typeof event.over.id === "string" && event.over.id.startsWith("tier-row-")
        ? event.over.id.slice("tier-row-".length)
        : undefined);
    if (!nikkeName || !targetRowId) return;
    onChange(
      moveNikke(board, {
        nikkeName,
        targetRowId,
        targetIndex: typeof overData.index === "number" ? overData.index : undefined,
      })
    );
  }

  return (
    <DndContext
      id="nikke-tier-dnd"
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div className="grid gap-5">
        <section className="rounded-3xl border border-[var(--border)] bg-[var(--theme-panel)] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.18)] lg:p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold text-[var(--text)]">
                <EditableLabel
                  value={board.sectionName}
                  canEdit={canEdit}
                  onChange={(sectionName) => onChange({ ...board, sectionName })}
                />
              </h2>
              {saving ? <span className="text-xs text-[var(--muted)]">저장 중…</span> : null}
            </div>

            {canEdit ? (
              <button
                type="button"
                onClick={() => setSettingsOpen((open) => !open)}
                aria-label="티어 설정"
                title="설정"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[var(--border)] bg-[var(--card)] text-xl text-[var(--theme-text-soft)] transition hover:rotate-45 hover:border-cyan-400"
              >
                ⚙
              </button>
            ) : null}
          </div>

          {canEdit && settingsOpen ? (
            <TierSettingsPanel
              rows={board.rows}
              onChange={updateRows}
              onClearAssignments={() => onChange(clearTierAssignments(board))}
              onResetAll={() => onChange(createDefaultTierBoard())}
              onClose={() => setSettingsOpen(false)}
            />
          ) : null}

          <div className="mt-4 grid gap-2.5">
            {board.rows.map((row) => (
              <TierRowView
                key={row.id}
                row={row}
                nikkesByName={nikkesByName}
                canEdit={canEdit}
                onRemoveNikke={(name) => onChange(removeNikkeFromTier(board, name))}
                onNameChange={(name) =>
                  updateRows(
                    board.rows.map((item) => (item.id === row.id ? { ...item, name } : item))
                  )
                }
                getPublicUrl={getPublicUrl}
              />
            ))}
          </div>
        </section>

        <TierNikkeCatalog
          nikkes={nikkes}
          assignedTiers={assignedTiers}
          canEdit={canEdit}
          getPublicUrl={getPublicUrl}
          bursts={bursts}
          elements={elements}
          roles={roles}
        />
      </div>

    </DndContext>
  );
}
