/* EXP Stock Game — Service Worker
 * 배포할 때마다 VERSION 값을 올려 주세요. (예: v1.0.1)
 * 그래야 사용자 기기에서 "새 버전" 안내가 뜨고 캐시가 교체됩니다.
 */
const VERSION = "v1.0.0";
const SHELL_CACHE = `exp-shell-${VERSION}`;
const CDN_CACHE = "exp-cdn-v1";

const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-192.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png",
  "./icons/favicon-32.png",
  "./icons/shortcut-96.png"
];

// 폰트·라이브러리 CDN — 오프라인에서도 화면이 깨지지 않도록 보관
const CDN_HOSTS = ["fonts.googleapis.com", "fonts.gstatic.com", "cdn.jsdelivr.net"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL))
  );
  // 첫 설치(기존 SW 없음)일 때만 즉시 활성화. 업데이트는 사용자가 확인 후 적용.
  if (!self.registration.active) self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((k) => k.startsWith("exp-shell-") && k !== SHELL_CACHE)
        .map((k) => caches.delete(k))
    );
    if (self.registration.navigationPreload) {
      try { await self.registration.navigationPreload.enable(); } catch {}
    }
    await self.clients.claim();
  })());
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
  if (event.data === "GET_VERSION" && event.ports[0]) event.ports[0].postMessage(VERSION);
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Supabase(저장/불러오기)는 절대 캐시하지 않음 — 항상 네트워크
  if (url.hostname.endsWith(".supabase.co") || url.hostname.endsWith(".supabase.in")) return;

  // 페이지 이동: 네트워크 우선 → 실패 시 캐시된 앱 화면
  if (req.mode === "navigate") {
    event.respondWith(networkFirstPage(event));
    return;
  }

  // 같은 출처 정적 파일: 캐시 우선 + 백그라운드 갱신
  if (url.origin === self.location.origin) {
    event.respondWith(staleWhileRevalidate(req, SHELL_CACHE));
    return;
  }

  // 폰트/라이브러리 CDN: 캐시 우선 + 백그라운드 갱신
  if (CDN_HOSTS.includes(url.hostname)) {
    event.respondWith(staleWhileRevalidate(req, CDN_CACHE));
  }
});

async function networkFirstPage(event) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const preload = await event.preloadResponse;
    const res = preload || await fetch(event.request);
    if (res && res.ok) cache.put("./index.html", res.clone());
    return res;
  } catch {
    return (await cache.match("./index.html")) ||
           (await cache.match("./")) ||
           new Response("<h1>오프라인입니다</h1>", { headers: { "Content-Type": "text/html; charset=utf-8" } });
  }
}

async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req, { ignoreSearch: cacheName === SHELL_CACHE });
  const network = fetch(req)
    .then((res) => {
      if (res && (res.ok || res.type === "opaque")) cache.put(req, res.clone());
      return res;
    })
    .catch(() => null);

  if (cached) {
    // 백그라운드 갱신이 SW 종료로 끊기지 않게 유지
    network.catch(() => {});
    return cached;
  }
  const res = await network;
  return res || new Response("", { status: 504, statusText: "Offline" });
}
