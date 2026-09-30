import { deflateSync, inflateSync, strFromU8, strToU8 } from 'fflate'
import type { Board } from '../types'

/**
 * 판 설정을 링크 주소에 담기 위한 인코딩.
 *
 * 짧은 배열로 포장해 deflate로 압축한 뒤 주소에 쓸 수 있는 문자로 바꾼다.
 * 결과는 **`#` 뒤에** 붙인다. 해시는 서버로 전송되지 않으므로
 * 판 내용이 접속 기록에 남지 않고, 오프라인에서도 같은 index.html 하나로 열린다.
 */

/**
 * 자리로만 구분하는 배열 형태. **뒤에 덧붙이는 식으로만 늘린다.**
 *   0..5 — 1판부터 있던 자리
 *   6..7 — 2판에서 추가 (방식, 승리 줄 수)
 *   8    — 3판에서 추가 (링크 구분용 임의 값)
 *
 * 2026-09-30 간소화로 섞기(3)·공짜 칸(4)·문항(5)·방식(6)은 더 쓰지 않는다.
 * 그래도 자리는 지운 채 그대로 둔다 — 당기면 이미 보낸 링크의 뜻이 바뀐다.
 * 새 링크는 이 자리를 언제나 같은 값(끔 · 끔 · 빈 목록 · 각자 판)으로 채운다.
 */
type PackedBoard = [
  version: number,
  title: string,
  size: number,
  shuffle: 0,
  freeCenter: 0,
  cells: [],
  mode: 1,
  targetLines: number,
  nonce: string,
]

const VERSION = 3

function pack(board: Board): PackedBoard {
  return [VERSION, board.title, board.size, 0, 0, [], 1, board.targetLines, board.nonce]
}

/**
 * 옛 링크도 연다. 1·2판에서 쓰던 문항·섞기·공짜 칸은 읽지 않는다 —
 * 지금은 링크를 받은 사람이 자기 문항을 채우는 방식 하나뿐이기 때문이다.
 */
function unpack(packed: unknown): Board {
  if (!Array.isArray(packed) || packed.length < 6) {
    throw new Error('판 정보의 형태가 올바르지 않습니다.')
  }
  const [version, title, size, , , , , targetLines, nonce] = packed as unknown[]
  if (version !== 1 && version !== 2 && version !== 3) {
    throw new Error('지원하지 않는 판 형식입니다. 링크를 만든 쪽이 더 새 버전일 수 있습니다.')
  }
  if (size !== 3 && size !== 4 && size !== 5) {
    throw new Error('판 크기가 올바르지 않습니다.')
  }
  return {
    title: typeof title === 'string' && title.length > 0 ? title : '빙고',
    size,
    // 1판 링크는 승리 줄 수가 없다. 그때의 동작인 '1줄이면 승리'로 읽는다.
    targetLines: typeof targetLines === 'number' && Number.isInteger(targetLines) && targetLines >= 1 ? targetLines : 1,
    nonce: typeof nonce === 'string' ? nonce : '',
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
  let packed: unknown
  try {
    packed = JSON.parse(json)
  } catch {
    throw new Error('링크가 손상되었습니다. 전체가 복사되었는지 확인해 주세요.')
  }
  return unpack(packed)
}

/**
 * 판 식별자. 내용에서 끌어내므로 **같은 링크는 언제나 같은 id**가 된다.
 * 서버 없이도 내 판을 링크별로 저장할 수 있는 이유다.
 */
export function boardIdOf(board: Board): string {
  return hashString(JSON.stringify(pack(board))).toString(36)
}

/** 새 링크에 붙일 임의 값. 16진수 10자리(40비트)라 한 기기 안에서 겹칠 일이 없다 */
export function newNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(5))
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
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
