/**
 * 오프라인 캐시용 서비스 워커.
 *
 * 이 파일은 그대로 배포되지 않는다. 빌드가 끝나면 vite.config.ts의 `offlineCache`가
 * 맨 앞에 두 줄을 붙여 `dist/sw.js`로 낸다.
 *
 *   VERSION  — dist 전체 내용의 해시. 한 글자라도 바뀌면 달라진다
 *   PRECACHE — dist의 파일 목록 (sw.js 자신은 뺀다)
 *
 * VERSION이 바뀌면 sw.js의 내용도 바뀌므로, 브라우저가 새 서비스 워커를 설치하고
 * 새 파일을 통째로 받아 둔다. 옛 캐시는 그때 지운다.
 */

/* global VERSION, PRECACHE */

// imjae.github.io 도메인은 다른 저장소의 페이지와 캐시 저장소를 같이 쓴다.
// 우리 것만 지우도록 이름 앞머리로 가린다.
const CACHE_PREFIX = 'bingoshare-'
const CACHE = CACHE_PREFIX + VERSION

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      // 새 버전을 기다리게 두지 않는다. 다음에 열 때 바로 새 버전이 뜬다.
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) {
    return
  }

  // 페이지 요청은 언제나 받아 둔 index.html로 답한다.
  // 공유 링크의 판 정보는 # 뒤에 있어서 서버로 가지 않으므로, 어떤 링크든 index.html 하나면 된다.
  const target = request.mode === 'navigate' ? new URL('index.html', self.location).href : request.url

  event.respondWith(
    caches
      .open(CACHE)
      // ignoreVary가 없으면 오프라인에서 JS·CSS를 못 찾는다. 서버가 `Vary: Origin`을 붙이는데,
      // 받아 둘 때의 요청엔 Origin이 없고 페이지가 crossorigin으로 부를 땐 브라우저가 Origin을 붙인다.
      // 캐시에는 파일마다 한 벌만 넣으므로 Vary를 무시하고 주소로만 찾아도 안전하다.
      .then((cache) => cache.match(target, { ignoreVary: true }))
      .then((cached) => cached ?? fetch(request)),
  )
})
