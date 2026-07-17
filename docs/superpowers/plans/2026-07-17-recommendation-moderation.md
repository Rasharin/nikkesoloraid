# Recommendation Moderation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 마스터가 추천 조합의 원본 저장 덱을 숨김·수정·삭제하고 사용자를 차단하여 허위 점수가 추천 집계를 오염시키지 못하게 한다.

**Architecture:** Supabase에 최소한의 moderation 상태와 알림을 추가하고, 보안 경계가 필요한 관리 동작은 마스터 검증 Route Handler로 제공한다. 추천 탭은 원본 기록 관리 패널을, 마이페이지는 차단 사용자 관리 섹션을 제공한다.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase PostgreSQL/RLS, Node test runner

## Global Constraints

- 숨김 안내 문구는 승인된 두 문장을 그대로 사용한다.
- 요청하지 않은 사이트 구조와 기존 기능은 변경하지 않는다.
- 모든 관리 동작은 서버와 RLS 양쪽에서 마스터 권한을 검증한다.

---

### Task 1: 추천 moderation 규칙과 데이터베이스

**Files:**
- Create: `supabase/100_recommendation_moderation.sql`
- Test: `tests/recommend-moderation.test.mjs`
- Modify: `lib/recommend.ts`

**Interfaces:**
- Produces: `isDeckHiddenAfterModeration(deckUpdatedAt, hiddenDeckUpdatedAt): boolean`
- Produces: `public.get_recommendation_decks(raid_key text)` RPC

- [ ] 숨김 당시 수정 시각과 현재 수정 시각을 비교하는 실패 테스트를 작성하고 실행한다.
- [ ] 최소 구현으로 테스트를 통과시킨다.
- [ ] `decks.updated_at`, moderation/blocked/notices 테이블, 인덱스, RLS, 수정 시각 트리거와 필터링 RPC를 SQL migration에 추가한다.
- [ ] 전체 Node 테스트를 실행한다.

### Task 2: 마스터 관리 API와 사용자 알림 API

**Files:**
- Create: `lib/recommendation-moderation.ts`
- Create: `app/api/admin/recommendations/route.ts`
- Create: `app/api/admin/recommendations/[deckId]/route.ts`
- Create: `app/api/admin/blocked-users/route.ts`
- Create: `app/api/recommendation-notices/route.ts`
- Test: `tests/recommendation-moderation-api.test.mjs`

**Interfaces:**
- Produces: 원본 기록 조회 및 `hide`, `update_score`, `delete`, `block_user`, `unblock_user` 요청 형식
- Produces: 미확인 알림 조회/확인 응답 형식

- [ ] 입력 검증과 상태 전이 헬퍼의 실패 테스트를 작성하고 실행한다.
- [ ] 검증 헬퍼와 공통 관리자 클라이언트/마스터 검사 경계를 구현한다.
- [ ] 각 Route Handler가 세션과 마스터 권한을 확인한 뒤 제한된 동작만 수행하게 한다.
- [ ] API 테스트와 전체 Node 테스트를 실행한다.

### Task 3: 추천 탭 기록 관리 UI

**Files:**
- Create: `app/components/recommend/RecommendationRecordPanel.tsx`
- Modify: `app/components/tabs/RecommendTab.tsx`
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: Task 2의 추천 관리 API
- Produces: 마스터 전용 기록 버튼과 원본 데이터 관리 패널

- [ ] 기록 패널의 상태 변환/표시 헬퍼 실패 테스트를 작성하고 실행한다.
- [ ] 마스터에게만 기록 버튼을 표시하고 선택 조합의 원본 데이터를 불러온다.
- [ ] 숨김·수정·차단·삭제 성공 후 패널과 추천 데이터를 강제 갱신한다.
- [ ] TypeScript, lint와 전체 Node 테스트를 실행한다.

### Task 4: 숨김 알림과 차단 사용자 관리 UI

**Files:**
- Create: `app/components/recommend/RecommendationModerationNotice.tsx`
- Create: `app/components/mypage/BlockedUsersSection.tsx`
- Modify: `app/components/tabs/MyPageTab.tsx`
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: Task 2의 알림 및 차단 목록 API
- Produces: 사용자 1회 팝업과 마스터 차단 목록/해제 UI

- [ ] 알림 문구와 확인 상태에 대한 실패 테스트를 작성하고 실행한다.
- [ ] 로그인 사용자의 미확인 알림 팝업과 확인 처리를 연결한다.
- [ ] 마스터 관리 탭에 차단 유저 섹션과 해제 동작을 추가한다.
- [ ] 전체 테스트, lint, production build를 실행한다.

