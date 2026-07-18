# Tier Drag Overlay Removal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 드래그 복제 이미지와 빈 티어 줄 안내 문구를 제거한다.

**Architecture:** `TierBoard.tsx`에서 시각적 오버레이와 안내 텍스트만 제거한다. DnD 센서, 드롭 영역, 이동 데이터 흐름은 유지한다.

**Tech Stack:** TypeScript, React, dnd-kit, Node test runner

## Global Constraints

- 드래그 이동, 클릭 제거, 빈 줄 드롭 영역은 유지한다.
- 새로운 의존성을 추가하지 않는다.

---

### Task 1: 회귀 테스트와 최소 구현

**Files:**
- Modify: `tests/nikke-tier-tab.test.ts`
- Modify: `app/components/tabs/tier/TierBoard.tsx`

- [ ] 테스트에 `DragOverlay`, 오버레이 전용 상태, 빈 줄 안내 문구가 없고 `DndContext`, `moveNikke`, 드롭 영역이 유지되는지 추가한다.
- [ ] 테스트를 실행해 기존 코드에서 실패하는지 확인한다.
- [ ] `DragOverlay` import·렌더링·전용 상태와 빈 줄 텍스트만 제거한다.
- [ ] 전체 테스트, ESLint, 프로덕션 빌드를 실행한다.
- [ ] 검증된 변경을 `main`에 커밋한다.
