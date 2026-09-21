import { useEffect, useState } from 'react'

/**
 * 주소 해시 하나로 화면을 가른다.
 *
 *   (없음)        만들기
 *   #s=<판>       공유 — 만든 사람이 링크를 복사하는 화면
 *   #b=<판>       참가·진행 — 링크를 받은 사람이 여는 화면
 *
 * 해시를 쓰는 이유는 두 가지다. 정적 호스팅에서 서버 설정 없이 동작하고,
 * 해시는 서버로 전송되지 않아 판 내용이 접속 기록에 남지 않는다.
 */

export type Route =
  | { kind: 'create' }
  | { kind: 'share'; payload: string }
  | { kind: 'play'; payload: string }

export function parseHash(hash: string): Route {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash
  if (raw.startsWith('b=')) {
    return { kind: 'play', payload: raw.slice(2) }
  }
  if (raw.startsWith('s=')) {
    return { kind: 'share', payload: raw.slice(2) }
  }
  return { kind: 'create' }
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash))

  useEffect(() => {
    const onHashChange = () => setRoute(parseHash(window.location.hash))
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  return route
}

export function goTo(hash: string): void {
  window.location.hash = hash
}

/** 남에게 건네는 주소 — 언제나 참가·진행 화면으로 열린다. */
export function shareUrlOf(payload: string): string {
  const { origin, pathname, search } = window.location
  return `${origin}${pathname}${search}#b=${payload}`
}
