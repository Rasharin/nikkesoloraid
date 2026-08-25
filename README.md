# 1) 프로젝트 생성
npx create-next-app@latest soloraid-deck --ts --tailwind --eslint --app

cd soloraid-deck

# 2) 실행
npm run dev

## BlaBlaLink 연동 환경 설정

사용자는 공개한 BlaBlaLink 프로필 링크만 입력합니다. BlaBlaLink 게임 API는 유효한 로그인 세션을 요구하므로 세션 쿠키는 서버 전용 환경변수로만 관리하며 DB, 브라우저 저장소, 클라이언트 요청에 포함하지 않습니다. 서버별 `nikke_area_id`는 `lib/blablalink/constants.ts`에서 공통 관리합니다.

```env
NEXT_PUBLIC_BLABLALINK_PROFILE_URL=https://www.blablalink.com/user
BLABLALINK_COOKIE=game_openid=...; game_token=...; ...
```

`NEXT_PUBLIC_BLABLALINK_PROFILE_URL`은 `https://www.blablalink.com/user`로 설정하여 사용자가 `openid`가 포함된 자신의 공개 프로필 주소를 복사하게 합니다. `BLABLALINK_COOKIE`는 실제 BlaBlaLink API 요청의 `Cookie` 헤더 전체를 서버 런타임에만 설정하고 로그나 클라이언트 코드에 노출하지 않습니다. 세션이 만료되면 새 서버 세션으로 교체해야 합니다.
