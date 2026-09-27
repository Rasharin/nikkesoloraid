# 1) 프로젝트 생성
npx create-next-app@latest soloraid-deck --ts --tailwind --eslint --app

cd soloraid-deck

# 2) 실행
npm run dev

## BlaBlaLink 연동 환경 설정

사용자는 공개한 BlaBlaLink 프로필 링크만 입력합니다. BlaBlaLink 게임 API는 유효한 로그인 세션을 요구하므로 세션 쿠키는 서버 전용 환경변수로만 관리하며 DB, 브라우저 저장소, 클라이언트 요청에 포함하지 않습니다. 서버별 `nikke_area_id`는 `lib/blablalink/constants.ts`에서 공통 관리합니다.

```env
NEXT_PUBLIC_BLABLALINK_PROFILE_URL=https://www.blablalink.com/user
BLABLALINK_PROXY_URL=https://<your-cloudflare-worker>/
BLABLALINK_COOKIE=game_openid=...; game_token=...; ...
```

`NEXT_PUBLIC_BLABLALINK_PROFILE_URL`은 `https://www.blablalink.com/user`로 설정하여 사용자가 `openid`가 포함된 자신의 공개 프로필 주소를 복사하게 합니다. `BLABLALINK_COOKIE`는 실제 BlaBlaLink API 요청의 `Cookie` 헤더 전체를 서버 런타임에만 설정하고 로그나 클라이언트 코드에 노출하지 않습니다. 세션이 만료되면 새 서버 세션으로 교체해야 합니다.

`BLABLALINK_PROXY_URL`을 설정하면 연동은 프록시의 `/sync`와 `/health`를 우선 사용합니다. 프록시는 `BLABLA_COOKIE`를 시크릿으로 보관하고 `BLABLA_COOKIE` 값을 브라우저나 DB로 전달하지 않는 별도 Worker여야 합니다. 프록시를 설정하지 않은 개발 환경에서는 기존 `BLABLALINK_COOKIE` 방식으로 fallback합니다. 운영 배포에서는 프록시를 설정한 뒤 `/api/blablalink/health`의 `upstream.code`가 `0`인지 확인합니다.
