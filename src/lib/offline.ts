/**
 * 인터넷이 끊겨도 앱이 열리게 서비스 워커를 등록한다.
 *
 * 서비스 워커 본체는 `sw/service-worker.js`이고, 빌드가 캐시할 파일 목록을 붙여
 * `dist/sw.js`로 낸다 (vite.config.ts의 `offlineCache`).
 *
 * 개발 서버에서는 등록하지 않는다. 개발 중 파일이 캐시에 붙잡히면 고친 코드가 안 보인다.
 *
 * 한계: **처음 한 번은 인터넷이 있어야 한다.** 그때 앱을 통째로 받아 둔다.
 */
export function registerOffline(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) {
    return
  }
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      // 등록에 실패해도 온라인에서는 그대로 동작한다. 오프라인에서 열리지 않을 뿐이다.
    })
  })
}
