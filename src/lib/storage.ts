/**
 * 진행 상황과 참가자 이름을 읽고 쓰는 **유일한 통로.**
 *
 * M1은 브라우저 저장소만 쓴다 — 서버가 없으므로 내 진행만 남는다.
 * M2에서 현황판을 붙일 때는 **이 파일만 갈아끼운다.** 화면 코드는 그대로 둔다.
 *
 * 저장소는 사생활 보호 모드나 저장 차단 설정에서 통째로 막힐 수 있으므로
 * 모든 접근을 감싸고, 실패해도 앱이 멈추지 않게 한다.
 */

const NAME_PREFIX = 'bingoshare:name:'
const PROGRESS_PREFIX = 'bingoshare:progress:'
const OWN_CELLS_PREFIX = 'bingoshare:cells:'

function readRaw(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeRaw(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // 저장이 막힌 환경이면 이번 세션 동안만 유지된다. 알릴 만한 일은 아니다.
  }
}

export function loadParticipantName(boardId: string): string | null {
  const name = readRaw(NAME_PREFIX + boardId)
  return name && name.length > 0 ? name : null
}

export function saveParticipantName(boardId: string, name: string): void {
  writeRaw(NAME_PREFIX + boardId, name)
}

export function loadProgress(boardId: string, participant: string): Set<number> {
  const raw = readRaw(`${PROGRESS_PREFIX}${boardId}:${participant}`)
  if (!raw) {
    return new Set()
  }
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return new Set()
    }
    return new Set(parsed.filter((value): value is number => typeof value === 'number'))
  } catch {
    return new Set()
  }
}

export function saveProgress(boardId: string, participant: string, checked: ReadonlySet<number>): void {
  writeRaw(`${PROGRESS_PREFIX}${boardId}:${participant}`, JSON.stringify([...checked]))
}

/**
 * 각자 판 모드에서 참가자가 직접 적은 문항.
 * 한 번 정하면 바꾸지 않는다 — 바꾸면 이미 체크한 칸의 내용이 달라지기 때문이다.
 */
export function loadOwnCells(boardId: string, participant: string): string[] | null {
  const raw = readRaw(`${OWN_CELLS_PREFIX}${boardId}:${participant}`)
  if (!raw) {
    return null
  }
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return null
    }
    const cells = parsed.filter((value): value is string => typeof value === 'string')
    return cells.length > 0 ? cells : null
  } catch {
    return null
  }
}

export function saveOwnCells(boardId: string, participant: string, cells: string[]): void {
  writeRaw(`${OWN_CELLS_PREFIX}${boardId}:${participant}`, JSON.stringify(cells))
}

export function clearOwnCells(boardId: string, participant: string): void {
  try {
    window.localStorage.removeItem(`${OWN_CELLS_PREFIX}${boardId}:${participant}`)
  } catch {
    // 지우지 못해도 다음 저장이 덮어쓴다.
  }
}
