import { cellCountOf } from './board'
import type { BoardSize, MyBoard } from '../types'

/**
 * 내 판을 읽고 쓰는 **유일한 통로.**
 *
 * 브라우저 저장소에만 둔다. 서버가 없으니 인터넷이 끊겨도 그대로 읽고 쓴다.
 * 저장 방식을 바꿀 일이 생기면 **이 파일만 갈아끼운다.** 화면 코드는 그대로 둔다.
 *
 * 저장소는 사생활 보호 모드나 저장 차단 설정에서 통째로 막힐 수 있으므로
 * 모든 접근을 감싸고, 실패해도 앱이 멈추지 않게 한다.
 */

// imjae.github.io 도메인은 다른 저장소의 페이지와 저장소를 같이 쓴다. 앞머리로 우리 것만 가린다.
// 2026-09-30 간소화 전의 키(name: · progress: · cells:)와도 섞이지 않게 새 앞머리를 쓴다.
const PREFIX = 'bingoshare:mine:'

/** 저장소에 실제로 들어가는 모양. 목록에서 판을 다시 열려면 링크 조각이 필요하다 */
type StoredBoard = MyBoard & {
  payload: string
  updatedAt: number
}

/** 이 기기에 저장된 판 하나 — 처음 화면의 목록에 쓴다 */
export type SavedEntry = {
  boardId: string
  payload: string
  name: string
  checked: number[]
  updatedAt: number
}

function readRaw(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeRaw(key: string, value: string): boolean {
  try {
    window.localStorage.setItem(key, value)
    return true
  } catch {
    return false
  }
}

/** 손으로 고쳤거나 옛 형식이어도 무너지지 않게, 모양만 확인하고 나머지는 기본값으로 채운다 */
function parseStored(raw: string | null): StoredBoard | null {
  if (!raw) {
    return null
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (typeof parsed !== 'object' || parsed === null) {
    return null
  }
  const record = parsed as Record<string, unknown>
  if (typeof record.payload !== 'string') {
    return null
  }
  return {
    payload: record.payload,
    name: typeof record.name === 'string' ? record.name : '',
    cells: Array.isArray(record.cells) ? record.cells.map((cell) => (typeof cell === 'string' ? cell : '')) : [],
    checked: Array.isArray(record.checked)
      ? record.checked.filter((value): value is number => Number.isInteger(value))
      : [],
    updatedAt: typeof record.updatedAt === 'number' ? record.updatedAt : 0,
  }
}

/**
 * 링크 하나에 해당하는 내 판. 없으면 `null`.
 * 칸 수는 판 크기에 맞춰 자르거나 빈 칸으로 채우고, 판 밖의 체크는 버린다.
 */
export function loadMyBoard(boardId: string, size: BoardSize): MyBoard | null {
  const stored = parseStored(readRaw(PREFIX + boardId))
  if (!stored) {
    return null
  }
  const total = cellCountOf(size)
  return {
    name: stored.name,
    cells: Array.from({ length: total }, (_, i) => stored.cells[i] ?? ''),
    checked: [...new Set(stored.checked)].filter((index) => index >= 0 && index < total).sort((a, b) => a - b),
  }
}

/** 저장에 성공했는지 돌려준다. 실패하면 화면이 알려야 한다 — 창을 닫으면 판이 사라지기 때문이다 */
export function saveMyBoard(boardId: string, payload: string, board: MyBoard): boolean {
  const record: StoredBoard = { ...board, payload, updatedAt: Date.now() }
  return writeRaw(PREFIX + boardId, JSON.stringify(record))
}

/** 이 기기에 저장된 판 전부. 최근에 만진 것부터 */
export function listMyBoards(): SavedEntry[] {
  const keys: string[] = []
  try {
    const store = window.localStorage
    for (let i = 0; i < store.length; i += 1) {
      const key = store.key(i)
      if (key?.startsWith(PREFIX)) {
        keys.push(key)
      }
    }
  } catch {
    return []
  }

  const entries: SavedEntry[] = []
  for (const key of keys) {
    const stored = parseStored(readRaw(key))
    if (stored) {
      entries.push({
        boardId: key.slice(PREFIX.length),
        payload: stored.payload,
        name: stored.name,
        checked: stored.checked,
        updatedAt: stored.updatedAt,
      })
    }
  }
  return entries.sort((a, b) => b.updatedAt - a.updatedAt)
}

/**
 * 공간이 모자랄 때 이 사이트의 저장분을 지우지 말아 달라고 브라우저에 부탁한다.
 * 거절되거나 지원하지 않아도 저장 자체는 된다 — 오래 두었을 때 지워질 위험만 남는다.
 */
export function requestPersistence(): void {
  try {
    navigator.storage?.persist?.().catch(() => {})
  } catch {
    // 부탁을 못 해도 저장은 된다.
  }
}
