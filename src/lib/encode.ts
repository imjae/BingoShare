import { deflateSync, inflateSync, strFromU8, strToU8 } from 'fflate'
import type { Board, BoardSize, GameMode } from '../types'

/**
 * 판을 링크 주소에 담기 위한 인코딩.
 *
 * 주소 길이가 곧 한계이므로 두 단계로 줄인다.
 *   1. 키 이름을 한 글자로 줄인 배열 형태로 포장
 *   2. deflate 압축 후 주소에 쓸 수 있는 문자로 변환
 *
 * 압축 결과는 **`#` 뒤에** 붙인다. 해시는 서버로 전송되지 않으므로
 * 판 내용이 접속 기록에 남지 않는다.
 */

/**
 * 자리로만 구분하는 배열 형태. 뒤에 덧붙이는 식으로만 늘린다.
 *   0..5 — 1판부터 있던 자리
 *   6..7 — 2판에서 추가 (모드, 승리 줄 수)
 */
type PackedBoard = [
  version: number,
  title: string,
  size: BoardSize,
  shuffle: 0 | 1,
  freeCenter: 0 | 1,
  cells: string[],
  mode?: 0 | 1,
  targetLines?: number,
]

const MODE_CODE: Record<GameMode, 0 | 1> = { shared: 0, own: 1 }

function pack(board: Board): PackedBoard {
  return [
    2,
    board.title,
    board.size,
    board.shuffle ? 1 : 0,
    board.freeCenter ? 1 : 0,
    board.cells,
    MODE_CODE[board.mode],
    board.targetLines,
  ]
}

function unpack(packed: unknown): Board {
  if (!Array.isArray(packed) || packed.length < 6) {
    throw new Error('판 정보의 형태가 올바르지 않습니다.')
  }
  const [version, title, size, shuffle, freeCenter, cells, mode, targetLines] = packed as PackedBoard
  if (version !== 1 && version !== 2) {
    throw new Error('지원하지 않는 판 형식입니다. 링크를 만든 쪽이 더 새 버전일 수 있습니다.')
  }
  if (size !== 3 && size !== 4 && size !== 5) {
    throw new Error('판 크기가 올바르지 않습니다.')
  }
  if (!Array.isArray(cells) || cells.some((cell) => typeof cell !== 'string')) {
    throw new Error('문항 목록이 올바르지 않습니다.')
  }
  // 1판 링크는 모드와 승리 줄 수가 없다. 그때의 동작인 '하나의 판 공유, 1줄이면 승리'로 읽는다.
  return {
    version: 2,
    mode: mode === 1 ? 'own' : 'shared',
    title: typeof title === 'string' ? title : '',
    size,
    shuffle: shuffle === 1,
    freeCenter: freeCenter === 1,
    cells,
    targetLines: typeof targetLines === 'number' && targetLines >= 1 ? targetLines : 1,
  }
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ''
  // 한 번에 넘기면 인자 개수 제한에 걸리므로 잘라서 넘긴다.
  const CHUNK = 0x8000
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlToBytes(text: string): Uint8Array {
  const base64 = text.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

export function encodeBoard(board: Board): string {
  const json = JSON.stringify(pack(board))
  const compressed = deflateSync(strToU8(json), { level: 9 })
  return bytesToBase64Url(compressed)
}

export function decodeBoard(payload: string): Board {
  let json: string
  try {
    json = strFromU8(inflateSync(base64UrlToBytes(payload)))
  } catch {
    throw new Error('링크가 손상되었습니다. 전체가 복사되었는지 확인해 주세요.')
  }
  return unpack(JSON.parse(json))
}

/**
 * 판 식별자. 내용에서 끌어내므로 **같은 판은 언제나 같은 id**가 된다.
 * 서버 없이도 진행 상황을 판별로 저장할 수 있는 이유다.
 */
export function boardIdOf(board: Board): string {
  return hashString(JSON.stringify(pack(board))).toString(36)
}

/** FNV-1a 32비트. 암호용이 아니라 식별용이다. */
export function hashString(text: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}
