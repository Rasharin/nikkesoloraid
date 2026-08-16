# Solo Raid Schedule Editing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 예약 목록의 긴 보스 이름을 15자로 축약하고, 예약된 보스의 이름·설명·기간을 한 번에 수정할 수 있게 한다.

**Architecture:** 표시용 이름 축약은 `lib/solo-raid-schedule.ts`의 순수 함수로 분리해 단위 테스트한다. 기존 인라인 기간 수정 UI와 PATCH 경로를 확장해 이름과 설명을 함께 전달하며, 예약 식별 키와 이미지는 유지한다.

**Tech Stack:** TypeScript, React 19, Next.js App Router, Tailwind CSS, Supabase, Node test runner

## Global Constraints

- 예약 카드 이름은 15자까지 표시하고 초과 시 `...`을 붙인다.
- 전체 이름은 `title` 속성으로 확인할 수 있어야 한다.
- 예약 상태인 항목만 수정할 수 있다.
- `raid_key`와 `image_path`는 변경하지 않는다.
- 이름은 필수이고 설명은 빈 문자열을 허용한다.
- 이름·설명·시작·종료 시각은 한 번의 PATCH 요청으로 저장한다.

---

### Task 1: 표시 이름 축약 규칙

**Files:**
- Modify: `lib/solo-raid-schedule.ts`
- Modify: `tests/solo-raid-schedule.test.mjs`
- Modify: `app/components/tabs/MyPageTab.tsx`

**Interfaces:**
- Produces: `formatSoloRaidScheduleLabel(label: string, maxLength?: number): string`
- Consumes: 예약 카드의 `schedule.raidLabel`

- [ ] **Step 1: 15자 이하와 초과 이름을 검증하는 실패 테스트 작성**

```js
test("formatSoloRaidScheduleLabel shortens names longer than 15 characters", () => {
  assert.equal(formatSoloRaidScheduleLabel("123456789012345"), "123456789012345");
  assert.equal(formatSoloRaidScheduleLabel("1234567890123456"), "123456789012345...");
});
```

- [ ] **Step 2: 테스트를 실행해 export가 없어 실패하는지 확인**

Run: `npm test -- --test-name-pattern="formatSoloRaidScheduleLabel"`
Expected: FAIL because `formatSoloRaidScheduleLabel` is not exported.

- [ ] **Step 3: 최소 축약 함수 구현**

```ts
export function formatSoloRaidScheduleLabel(label: string, maxLength = 15) {
  return label.length > maxLength ? `${label.slice(0, maxLength)}...` : label;
}
```

- [ ] **Step 4: 예약 카드에 축약 문자열과 전체 이름 툴팁 연결**

```tsx
<span title={schedule.raidLabel} className="text-sm font-semibold text-neutral-100">
  {formatSoloRaidScheduleLabel(schedule.raidLabel)}
</span>
```

- [ ] **Step 5: 단위 테스트 실행**

Run: `npm test -- --test-name-pattern="formatSoloRaidScheduleLabel"`
Expected: PASS.

### Task 2: 예약 전체 내용 인라인 수정

**Files:**
- Modify: `app/components/tabs/MyPageTab.tsx`
- Modify: `app/page.tsx`
- Modify: `app/api/admin/solo-raid-schedules/[id]/route.ts`
- Create: `tests/solo-raid-schedule-edit.test.ts`

**Interfaces:**
- Consumes: `{ id, title, description, startsAtInput, endsAtInput }`
- Produces: PATCH body `{ title, description, startsAt, endsAt }`
- Persists: `{ raid_label, description, starts_at, ends_at, updated_at }`

- [ ] **Step 1: UI와 API 계약을 고정하는 실패 테스트 작성**

```ts
test("scheduled raid editing includes name, description, and period", () => {
  const component = readFileSync("app/components/tabs/MyPageTab.tsx", "utf8");
  const page = readFileSync("app/page.tsx", "utf8");
  const route = readFileSync("app/api/admin/solo-raid-schedules/[id]/route.ts", "utf8");

  assert.match(component, /editingScheduleTitle/);
  assert.match(component, /editingScheduleDescription/);
  assert.match(component, /\{isEditing \? "취소" : "수정"\}/);
  assert.match(page, /JSON\.stringify\(\{ title: .*description: .*startsAt, endsAt \}\)/s);
  assert.match(route, /raid_label:\s*title/);
  assert.match(route, /description/);
});
```

- [ ] **Step 2: 새 계약 테스트가 현재 코드에서 실패하는지 확인**

Run: `node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --test --experimental-strip-types tests/solo-raid-schedule-edit.test.ts`
Expected: FAIL because title and description edit state and PATCH fields do not exist.

- [ ] **Step 3: MyPageTab의 편집 상태와 입력 UI 확장**

이름과 설명 상태를 추가하고 `startEditingSchedule`에서 기존 값을 채운다. 수정 영역은 이름 input, 설명 textarea, 시작·종료 datetime-local input, 저장 버튼 순서로 구성한다. 저장 성공 시 네 편집 상태를 초기화하고 버튼 문구를 `수정`으로 변경한다.

- [ ] **Step 4: 페이지 payload와 클라이언트 검증 확장**

`UpdateSoloRaidSchedulePayload`에 `title`과 `description`을 추가한다. 이름을 trim한 값이 비어 있으면 토스트 후 중단하고, PATCH body에 trim한 이름·설명과 변환된 시작·종료 ISO 값을 함께 넣는다. 성공 메시지는 `예약 수정 완료`로 바꾼다.

- [ ] **Step 5: PATCH API의 서버 검증과 갱신 필드 확장**

요청 body에서 trim한 `title`, `description`을 읽는다. 빈 이름에는 400 응답을 반환한다. Supabase update 객체를 다음 형태로 확장한다.

```ts
{
  raid_label: title,
  description,
  starts_at: startsAt,
  ends_at: endsAt,
  updated_at: new Date().toISOString(),
}
```

- [ ] **Step 6: 계약 테스트와 전체 예약 테스트 실행**

Run: `node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --test --experimental-strip-types tests/solo-raid-schedule-edit.test.ts tests/solo-raid-schedule.test.mjs`
Expected: PASS.

### Task 3: 전체 검증 및 화면 확인

**Files:**
- Verify: `app/components/tabs/MyPageTab.tsx`
- Verify: `app/page.tsx`
- Verify: `app/api/admin/solo-raid-schedules/[id]/route.ts`

**Interfaces:**
- Consumes: Task 1과 Task 2의 완성된 UI/API 계약
- Produces: 자동 검사와 실제 화면 검증 결과

- [ ] **Step 1: 전체 테스트 실행**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 2: 수정 파일 ESLint 실행**

Run: `npx eslint app/components/tabs/MyPageTab.tsx app/page.tsx "app/api/admin/solo-raid-schedules/[id]/route.ts" lib/solo-raid-schedule.ts tests/solo-raid-schedule-edit.test.ts`
Expected: zero errors.

- [ ] **Step 3: 프로덕션 빌드 실행**

Run: `npm run build`
Expected: exit code 0.

- [ ] **Step 4: 실행 화면 확인**

개발 서버에서 마스터 마이페이지의 보스 관리로 이동해 16자 이상 예약 이름이 15자와 `...`으로 보이는지 확인한다. `수정`을 눌러 전체 이름·설명·기간이 채워지는지, 좁은 폭과 데스크톱 폭에서 입력란과 버튼이 카드 밖으로 넘치지 않는지 확인한다.

- [ ] **Step 5: 최종 변경 범위 검토**

Run: `git diff --check && git status --short`
Expected: whitespace errors are absent and only planned files are modified.
