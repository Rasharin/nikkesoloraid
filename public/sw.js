const CACHE_NAME = "nideck-static-v1";

// 항상 네트워크 직접 요청 (캐시 완전 우회)
// - Supabase: 니케 목록, 유저 덱, 기션 추천덱 등 모든 실시간 데이터
// - Next.js 이미지 최적화 API
const NETWORK_ONLY = [
  /supabase\.co/,
  /\/_next\/image(\?|$)/,
  /\/api\//,
];

// Cache-first: 절대 바뀌지 않는 정적 파일만
const CACHE_FIRST = [
  /\/nikke-images\//,          // 캐릭터 이미지 (핵심)
  /\/blablalink-icon\.webp$/,  // 아이콘
  /\/logo[^/]*\.png$/,         // 로고
  /\/_next\/static\//,         // JS/CSS 번들 (파일명에 해시 포함 → 불변)
];

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // POST 등 비-GET 요청은 무조건 통과
  if (request.method !== "GET") return;

  const url = request.url;

  // 실시간 데이터는 SW 완전 우회 → 항상 최신 데이터 보장
  if (NETWORK_ONLY.some((p) => p.test(url))) return;

  // 정적 파일: 캐시 있으면 캐시 반환, 없으면 네트워크 요청 후 캐시 저장
  // 새로 추가된 니케 이미지는 첫 요청 시 캐시에 없으므로 네트워크에서 정상 로드됨
  if (CACHE_FIRST.some((p) => p.test(url))) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const hit = await cache.match(request);
        if (hit) return hit;

        const res = await fetch(request);
        if (res.ok) cache.put(request, res.clone());
        return res;
      })
    );
  }

  // 그 외 (페이지, RSC 세그먼트 등): SW 미개입, 브라우저 기본 동작
});
