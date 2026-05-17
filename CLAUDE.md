# 니케 솔로레이드 덱 구성 웹앱

니케(NIKKE) 게임의 솔로레이드 컨텐츠에서 덱 구성을 도와주는 웹 애플리케이션. 사용자가 보유한 니케를 등록하고 최적의 덱 조합을 추천받을 수 있습니다.

## 프로젝트 정보

- **언어**: TypeScript + React 18
- **프레임워크**: Next.js 14+ (App Router)
- **스타일**: Tailwind CSS
- **백엔드**: Supabase (PostgreSQL)
- **인증**: Supabase Auth + Google OAuth
- **배포**: Vercel

## 아키텍처 개요

### 상태 관리 패턴
- **페이지 레벨 상태**: `app/page.tsx`에서 관리 (탭, 테마, 설정)
- **로컬 스토리지**: `localStorage`를 통한 설정 영속성
- **인증 상태**: Supabase에서 자동 관리 (쿠키 + 토큰)

### 성능 최적화
- 헤더, 탭 컴포넌트는 `memo()`로 감싸서 불필요한 재렌더링 방지
- 탭 변경 시에만 필요한 컴포넌트만 재렌더링

### 데이터 영속성
사용자 설정은 다음 규칙에 따라 localStorage에 저장됩니다:
- `soloraid_theme_mode_v1`: 테마 (dark/light, 기본값: dark)
- `soloraid_score_display_mode_v1`: 점수 표기 방식 (1/4 또는 3/5, 기본값: 1/4)
- `soloraid_persist_session_v1`: 상시 로그인 (true/false, 기본값: true)

## 탭 구성

### 1. 홈 탭 (`/`)
메인 덱 구성 화면. 사용자의 니케 목록을 활용하여 덱을 구성하고 관리합니다.

**기능:**
- 니케 관리 탭에서 선택된 니케 목록을 활용하여 간단한 덱 구성
- 텍스트를 활용한 빠른 덱 추가
- 로컬 메모장 기능
- 내 저장된 덱 기반 자동 추천 조합 표기
  - 중복 사용되는 니케 없이 5마리 1덱, 5덱 구성
  - 5덱 점수 합계가 가장 높은 구성 표기

### 2. 저장된 덱 탭 (`/saved-deck`)
사용자가 저장한 덱 목록 열람 및 관리 화면.

**기능:**
- 홈탭 및 덱 빌딩 탭에서 작성한 덱 저장
- 저장된 덱 열람 및 재사용
- Supabase에 저장된 덱 데이터 동기화

### 3. 추천 탭 (`/deck-recommend`)
커뮤니티 기반 덱 추천 화면. 다른 사용자의 저장된 덱 데이터를 분석하여 인기 조합을 제시합니다.

**기능:**
- 로그인 사용자들의 저장된 덱 기반 사용 빈도 및 점수 평균 표기
- 특정 유저(submaster/kisean)의 저장된 덱 표시
- 추천 영상 및 게시판 형태의 솔로레이드 팁

### 4. 덱 빌딩 탭 (`/deck-building`)
고급 덱 구성 화면. 세부적인 조합 구성 및 분석이 가능합니다.

**기능:**
- 니케 관리에서 추가한 니케 목록 활용
- 덱 구성 및 상세 정보 표기
- 구성된 덱 기반 자동 추천 조합 표기

### 5. 사용법 탭 (`/usage`)
애플리케이션 사용 방법 및 튜토리얼.

### 6. 계산기 탭 (`/calculator`)
(조건부 표시) 덱 점수 계산 및 분석 도구.

### 7. 니케 관리 탭 (`/deck-setting`)
사용자의 니케 정보 관리 화면.

**기능:**
- 전체 니케 목록 조회
- 추천 니케 등록
- 즐겨찾기 등록
- 니케 별 정보 관리

### 8. 문의하기 탭 (`/faq`)
고객 지원 및 FAQ.

### 9. 마이페이지 (모달)
사용자 설정 화면.

**기능:**
- 테마 선택 (Dark/Light)
- 점수 표기 방식 선택 (1/4 점수 / 3/5 점수)
- 상시 로그인 On/Off 토글
  - On: 브라우저 창 닫아도 로그인 상태 유지 (localStorage 사용)
  - Off: 브라우저 창 닫으면 로그아웃 (sessionStorage 사용)
- 로그아웃

## 솔로레이드 시스템

### 시즌 관리
1. 매 시즌마다 새로운 보스가 등장
2. 마스터 계정에서 새 보스를 추가 및 솔로레이드 시작
3. 솔로레이드 기간 동안 저장된 덱은 보스별 탭에 저장 및 표기
4. 시즌 종료 시 모든 저장 데이터는 "시즌off" 섹션으로 이동

## 개발 규칙

### 상태 관리
1. **페이지 레벨 상태**: 탭, 테마, 사용자 설정 등은 `app/page.tsx`에서 관리
2. **로컬 스토리지**: 사용자 설정 저장 시 다음 패턴을 따릅니다:
   ```typescript
   // 1. 상수 정의
   const SETTING_KEY = "soloraid_setting_v1";
   
   // 2. 읽기 함수 (초기값 포함)
   function readStoredSetting(): string {
     if (typeof window === "undefined") return "default";
     try {
       return window.localStorage.getItem(SETTING_KEY) ?? "default";
     } catch {
       return "default";
     }
   }
   
   // 3. 상태 관리
   const [setting, setSetting] = useState<string>(() => readStoredSetting());
   
   // 4. 업데이트 함수
   const updateSetting = (value: string) => {
     setSetting(value);
     try {
       localStorage.setItem(SETTING_KEY, value);
     } catch { }
   };
   ```

3. **인증 토큰**: Supabase 인증 토큰은 `persistSessionState`에 따라 자동으로 이동됩니다:
   - On: localStorage (영속)
   - Off: sessionStorage (세션 종료 시 삭제)

### 컴포넌트 작성
1. **메모이제이션**: 탭 컴포넌트, 헤더는 `memo()`로 감싸서 불필요한 재렌더링 방지
2. **Props 전달**: 부모 컴포넌트에서 필요한 상태와 콜백 함수를 prop으로 전달
3. **타입 안정성**: 모든 컴포넌트에 명확한 타입 정의

### 스타일링
- **Tailwind CSS**: 유틸리티 클래스 우선
- **CSS 변수**: 테마 색상은 `--bg`, `--card`, `--text`, `--muted`, `--theme-text-soft` 등 CSS 변수 사용
- **반응형 디자인**: `lg:` 클래스로 데스크톱 대응

### 성능 최적화
1. 불필요한 재렌더링 방지를 위해 헤더, 탭은 `memo()`로 감싸기
2. 탭 변경 시 해당 탭 컴포넌트만 다시 렌더링되도록 구조화
3. Supabase 클라이언트는 싱글톤 패턴 사용 (`lib/supabase.ts`)

## 주요 파일 및 디렉토리

```
app/
├── page.tsx                 # 메인 페이지 (탭 관리, 상태 관리)
├── layout.tsx               # Root layout (메타데이터, 테마 스크립트)
├── globals.css              # 전역 스타일
├── components/
│   ├── Header.tsx           # 헤더 (탭 버튼, 프로필)
│   ├── LoginButton.tsx      # 로그인/프로필 버튼
│   └── tabs/
│       ├── HomeTab.tsx
│       ├── SavedDeckTab.tsx
│       ├── RecommendTab.tsx
│       ├── DeckBuildingTab.tsx
│       ├── UsageTab.tsx
│       ├── CalculatorTab.tsx
│       ├── DeckSettingTab.tsx
│       ├── ContactTab.tsx
│       └── MyPageTab.tsx    # 마이페이지 설정 탭
lib/
├── supabase.ts              # Supabase 클라이언트 팩토리
├── site.ts                  # 사이트 메타데이터
└── [기타 유틸리티]
```

## 인증 시스템

### Supabase 설정
- `lib/supabase.ts`의 `createSupabaseClient(persistSession)` 함수로 동적 스토리지 선택
- `persistSession: true` → localStorage 사용 (영속)
- `persistSession: false` → sessionStorage 사용 (세션 종료 시 삭제)

### OAuth 플로우
1. 사용자가 "로그인" 클릭
2. Google OAuth 리다이렉트
3. Supabase 자동 토큰 저장 및 세션 복원
4. URL 파라미터에서 인증 정보 자동 감지

## 메타데이터 및 SEO

- **타이틀**: "NiDeck" (기본), "%s | NiDeck" (템플릿)
- **설명**: "니케(NIKKE) 솔로레이드(솔레) 덱 조합, 추천, 기록, 솔로레이드 시즌별 기록, 솔레 팁."
- **키워드**: 니케 솔레, 니케 덱, 니케 솔로레이드, 니케 덱 추천, 니케 조합
- **언어**: 한국어 (ko_KR)

## 주의사항

1. **localStorage vs sessionStorage**: 항상 `persistSessionState`를 고려하여 적절한 스토리지 사용
2. **Supabase 클라이언트**: 기본 export `supabase` 사용 (이미 `persistSession: true`로 설정됨)
3. **테마 변경**: `updateThemeMode()` 함수 사용
4. **인증 상태**: Supabase 클라이언트에서 자동 관리 (수동 조작 금지)
5. **Props drilling**: 필요한 상태를 명확히 하여 불필요한 prop drilling 피하기

## 파일별 구조 가이드

웹 개선 요구 시 각 코딩 라인을 빠르게 파악하도록 작성되었습니다.

### app/page.tsx (메인 상태 관리)
**역할**: 전체 애플리케이션의 탭 전환, 사용자 설정(테마, 점수 표기, 상시로그인) 관리

**주요 섹션**:
| 섹션 | 라인 | 기능 |
|------|------|------|
| 상수 정의 | ~300-305 | `THEME_KEY`, `SCORE_DISPLAY_KEY`, `PERSIST_SESSION_KEY` |
| 읽기 함수 | ~310-325 | `readStoredThemeMode()`, `readStoredScoreDisplayMode()`, `readStoredPersistSession()` |
| 상태 정의 | ~1180-1190 | `currentTab`, `themeMode`, `scoreDisplayMode`, `persistSessionState` |
| 업데이트 함수 | ~1190-1250 | `updateThemeMode()`, `updateScoreDisplayMode()`, `updatePersistSession()` |
| useEffect (테마) | ~1570-1585 | DOM 업데이트, CSS 클래스/변수 변경 |
| useEffect (토큰 이동) | ~1585-1610 | auth 토큰 localStorage ↔ sessionStorage 이동 |
| MyPageTab Props | ~4600-4615 | `persistSession`, `onPersistSessionChange` 전달 |
| 탭 렌더링 | ~4620-4750 | 각 탭 컴포넌트 조건부 렌더링 |

**수정 시 고려사항**:
- 새로운 localStorage 설정 추가 시 위 패턴 따르기 (상수 → 읽기함수 → 상태 → 업데이트함수)
- MyPageTab prop 변경 시 반드시 props 전달 지점도 수정
- 탭 추가/제거 시 헤더의 TAB_ROUTE_MAP도 동시 수정

### app/layout.tsx (메타데이터 및 테마 스크립트)
**역할**: HTML 메타데이터, SEO 설정, 테마 초기화 스크립트 (FOUC 방지)

**주요 섹션**:
| 섹션 | 라인 | 기능 |
|------|------|------|
| 메타데이터 | 17-42 | title, description, keywords, OpenGraph |
| 테마 스크립트 | 52-57 | localStorage에서 테마 읽기 → HTML 초기화 (파일로드 전 실행) |

**수정 시 고려사항**:
- SEO 설명 변경 시 line 26 `description` 수정
- 새로운 테마 옵션 추가 시 line 55의 localStorage 키 추가

### app/components/Header.tsx (네비게이션 헤더)
**역할**: 탭 버튼, 로그인 버튼, 스크린리더용 메타데이터

**주요 섹션**:
| 섹션 | 라인 | 기능 |
|------|------|------|
| TAB_ROUTE_MAP | 10-19 | 탭 이름 → 라우트 매핑 |
| 아이콘 함수 | 28-135 | HomeIcon, SaveIcon, RecommendIcon 등 (SVG) |
| HeaderContent | 137-264 | 메인 헤더 렌더링 로직 |
| 탭 버튼 | 166-246 | 각 탭별 버튼 JSX (grid-cols-8 또는 grid-cols-7) |
| 스크린리더 텍스트 | 161-162 | sr-only h1, p 태그 |

**수정 시 고려사항**:
- 탭 추가 시 TAB_ROUTE_MAP과 버튼 JSX 모두 추가
- shouldShowCalculator에 따라 grid-cols 8/7 선택
- 로그인 상태에 따라 LoginButton props 변경

### app/components/tabs/MyPageTab.tsx (마이페이지 설정)
**역할**: 사용자 설정 UI (테마, 점수 표기, 상시로그인)

**주요 섹션**:
| 섹션 | 라인 | 기능 |
|------|------|------|
| Props 타입 | 110-120 | `persistSession`, `onPersistSessionChange` 포함 |
| 테마 버튼 | 450-507 | Dark/Light 토글 UI |
| 상시로그인 토글 | 510-530 | On/Off 토글 UI (테마 버튼 아래) |
| 로그아웃 버튼 | 535-550 | handleLogout 함수 연결 |

**수정 시 고려사항**:
- Props 추가/변경 시 타입 정의 필수
- UI 추가 시 `adminTabClass(condition)` 스타일 클래스 사용
- 설명 텍스트는 `text-xs text-neutral-400` 사용

### lib/supabase.ts (Supabase 클라이언트)
**역할**: Supabase 클라이언트 생성 및 설정

**주요 섹션**:
| 섹션 | 라인 | 기능 |
|------|------|------|
| normalizeCookieOptions | 4-12 | 쿠키 옵션 정규화 |
| createSupabaseClient | 14-41 | 팩토리 함수 (persistSession 파라미터 받음) |
| auth 설정 | 33-38 | persistSession에 따라 storage 선택 |
| 기본 export | 43 | `export const supabase = createSupabaseClient(true)` |

**수정 시 고려사항**:
- persistSession 로직은 app/page.tsx의 useEffect에서 처리
- localStorage/sessionStorage 직접 조작 금지 (Supabase에 위임)

### app/globals.css (전역 스타일)
**역할**: CSS 변수 정의, 다크/라이트 테마 색상, 글로벌 스타일

**주요 섹션**:
| 섹션 | 라인 | 기능 |
|------|------|------|
| CSS 변수 (dark) | ~10-30 | --bg, --card, --text, --muted 등 |
| CSS 변수 (light) | ~40-60 | light 모드용 오버라이드|
| 글로벌 스타일 | ~70-100 | body, a, button 등 기본 스타일 |

**수정 시 고려사항**:
- 색상 변경 시 dark/light 모드 모두 수정
- 반응형 디자인은 `@media lg:` 또는 tailwind `lg:` 클래스 사용

### app/components/tabs/*.tsx (개별 탭 컴포넌트)
**공통 구조**:
```typescript
type [TabName]Props = {
  // 부모에서 전달받는 props
};

function [TabName]Content({ /* destructured props */ }: [TabName]Props) {
  // 로직
  return <div>...</div>;
}

export default memo([TabName]Content);
```

**수정 시 고려사항**:
- 모든 탭은 `memo()`로 감싸기 (재렌더링 최적화)
- Props 추가 시 page.tsx의 탭 호출 부분도 수정
- Supabase 데이터 필요 시 `useEffect` + `useAuth()` 사용

## 향후 개선사항

- [ ] 다국어 지원 (i18n)
- [ ] PWA 기능 (오프라인 지원)
- [ ] 다크모드 외 추가 테마
- [ ] 모바일 앱 (React Native)
