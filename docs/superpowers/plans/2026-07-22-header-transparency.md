# 헤더 반투명 배경 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**목표:** 헤더 콘텐츠는 선명하게 유지하면서 중앙과 좌우 확장 배경을 60% 불투명하게 만든다.

**구조:** `full-width-header-bg` 클래스에서 공통 반투명 색상 변수를 정의하고 헤더 본체와 `::before`가 이를 함께 사용한다. 기존 헤더 레이아웃과 스태킹 구조는 변경하지 않는다.

**기술 스택:** Next.js, React, Tailwind CSS, CSS custom properties, Node.js 테스트

## 전체 제약

- 헤더 로고, 메뉴, 버튼에는 투명도를 적용하지 않는다.
- 다크·라이트 테마 모두 기존 `--bg` 색상을 기준으로 60% 불투명도를 계산한다.
- 좌우 확장 배경과 중앙 헤더 배경은 같은 색과 투명도를 사용한다.

---

### 작업 1: 헤더 반투명 배경

**파일:**
- 수정: `app/globals.css`
- 테스트: `tests/header-text-only-tabs.test.ts`

**인터페이스:**
- 입력: 기존 CSS 변수 `--bg`
- 출력: 새 CSS 변수 `--header-bg-translucent`

- [ ] **1단계: 실패하는 테스트 작성**

```ts
assert.match(globalStyles, /--header-bg-translucent:\s*color-mix\(in srgb, var\(--bg\) 60%, transparent\)/);
assert.match(globalStyles, /background:\s*var\(--header-bg-translucent\)/);
```

- [ ] **2단계: 테스트 실패 확인**

실행: `node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --test --experimental-strip-types tests/header-text-only-tabs.test.ts`

예상: `--header-bg-translucent`가 아직 없어 실패한다.

- [ ] **3단계: 최소 CSS 구현**

```css
.full-width-header-bg {
  --header-bg-translucent: color-mix(in srgb, var(--bg) 60%, transparent);
  background: var(--header-bg-translucent);
  isolation: isolate;
}

.full-width-header-bg::before {
  background: var(--header-bg-translucent);
}
```

- [ ] **4단계: 검증**

실행: `npm test`, `npx eslint app/components/Header.tsx tests/header-text-only-tabs.test.ts`, `npm run build`

예상: 모든 명령이 종료 코드 0으로 성공한다.

- [ ] **5단계: 브라우저 확인**

최신 프로덕션 화면에서 헤더 중앙과 화면 양끝의 계산된 배경값이 같고, 로고와 메뉴의 `opacity`가 `1`인지 확인한다.
