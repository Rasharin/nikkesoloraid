# Tier Reset and Removal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 티어 니케 클릭 제거, 두 종류의 초기화, 설정 명칭 변경, 덱 빌딩과 동일한 cyan 필터 선택 스타일을 제공한다.

**Architecture:** 티어 데이터 변경은 `lib/nikke-tier.ts`의 순수 함수로 구현한다. `TierBoard`가 카드 클릭과 전체 보드 변경을 연결하고, `TierSettingsPanel`은 확인창을 거쳐 목록 초기화 또는 전부 초기화 콜백을 호출한다.

**Tech Stack:** TypeScript, React 18, Next.js App Router, Tailwind CSS, Node test runner

## Global Constraints

- 기존 드래그 이동 동작을 유지한다.
- 열람 전용 이용자는 제거 및 초기화할 수 없다.
- 개발 환경 변경은 로컬 저장소에만 저장한다.
- 운영 환경은 기존 마스터·서브마스터 권한과 API 저장 흐름을 유지한다.

---

### Task 1: 티어 데이터 초기화 함수

**Files:**
- Modify: `lib/nikke-tier.ts`
- Test: `tests/nikke-tier.test.ts`

**Interfaces:**
- Produces: `removeNikkeFromTier(board: TierBoardData, nikkeName: string): TierBoardData`
- Produces: `clearTierAssignments(board: TierBoardData): TierBoardData`

- [ ] **Step 1: Write failing domain tests**

니케 한 명 제거 시 다른 배치와 줄 설정이 유지되고, 목록 초기화 시 모든 `nikkeNames`만 빈 배열이 되는 테스트를 추가한다.

- [ ] **Step 2: Run the domain tests and verify RED**

Run: `node --test --experimental-strip-types tests/nikke-tier.test.ts`
Expected: FAIL because the two functions are not exported.

- [ ] **Step 3: Implement immutable helpers**

각 함수는 입력 보드를 변경하지 않고 필요한 줄의 `nikkeNames`만 복사해 변경한다.

- [ ] **Step 4: Run the domain tests and verify GREEN**

Run: `node --test --experimental-strip-types tests/nikke-tier.test.ts`
Expected: all domain tests pass.

### Task 2: 카드 클릭 제거 및 설정 초기화 UI

**Files:**
- Modify: `app/components/tabs/tier/TierBoard.tsx`
- Modify: `app/components/tabs/tier/TierSettingsPanel.tsx`
- Test: `tests/nikke-tier-tab.test.ts`

**Interfaces:**
- Consumes: `removeNikkeFromTier`, `clearTierAssignments`, `createDefaultTierBoard`
- Produces: `TierSettingsPanelProps.onClearAssignments`, `TierSettingsPanelProps.onResetAll`

- [ ] **Step 1: Write failing component source tests**

카드 `onClick`, `목록 초기화`, `전부 초기화`, 확인창, `설정` 제목과 새 콜백 연결을 검사한다.

- [ ] **Step 2: Run the component tests and verify RED**

Run: `node --test --experimental-strip-types tests/nikke-tier-tab.test.ts`
Expected: FAIL because controls and handlers are absent.

- [ ] **Step 3: Connect the card click**

편집 가능 카드의 `onClick`이 `removeNikkeFromTier`로 보드를 갱신하게 하고 읽기 전용 카드는 변경하지 않는다.

- [ ] **Step 4: Add both reset controls**

설정 제목을 `설정`으로 변경한다. 확인창 승인 후 `목록 초기화`는 `clearTierAssignments(board)`, `전부 초기화`는 `createDefaultTierBoard()`를 기존 `onChange`에 전달한다.

- [ ] **Step 5: Run component and full tests**

Run: `npm test`
Expected: all tests pass.

### Task 3: 필터 스타일 및 최종 검증

**Files:**
- Modify: `app/components/tabs/tier/TierNikkeCatalog.tsx`
- Test: `tests/nikke-tier-tab.test.ts`

**Interfaces:**
- Produces: active filter classes `border-cyan-500/40 bg-cyan-500/10 text-[var(--text)]`

- [ ] **Step 1: Update the failing style assertion**

활성 필터가 덱 빌딩의 `점수 반영`과 같은 cyan 계열 클래스를 사용하는지 검사한다.

- [ ] **Step 2: Run the component test and verify RED**

Run: `node --test --experimental-strip-types tests/nikke-tier-tab.test.ts`
Expected: FAIL while the old emerald classes remain.

- [ ] **Step 3: Apply the cyan active style**

활성 필터 클래스를 `border-cyan-500/40 bg-cyan-500/10 text-[var(--text)]`로 변경한다.

- [ ] **Step 4: Verify the complete change**

Run: `npm test`
Expected: all tests pass.

Run: `npx eslint lib/nikke-tier.ts app/components/tabs/tier/TierBoard.tsx app/components/tabs/tier/TierSettingsPanel.tsx app/components/tabs/tier/TierNikkeCatalog.tsx tests/nikke-tier.test.ts tests/nikke-tier-tab.test.ts`
Expected: exit 0.

Run: `npm run build`
Expected: production build succeeds.

- [ ] **Step 5: Commit**

Commit the implementation to `main` with a focused feature message.
