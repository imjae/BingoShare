import { deflateSync, inflateSync, strFromU8, strToU8 } from 'fflate'
import { describe, expect, it } from 'vitest'
import { boardIdOf, decodeBoard, encodeBoard, newNonce } from './encode'
import type { Board } from '../types'

/**
 * 옛 버전 앱이 **실제로 만든** 링크 조각. 옛 커밋의 encode.ts를 그대로 돌려 뽑았다.
 * 흉내 낸 도우미로 만들면 흉내가 틀려도 테스트가 통과하므로, 진짜 문자열을 박아 둔다.
 */
const OLD_LINKS = {
  /** d00c0aa (1판) — 5×5, 섞기·공짜 칸 켬, 문항 24개 */
  v1: 'Tc87DkBQFIThrcipb2GO91rEjrQSJBI9Ghq2hLsHCjkj0_zdlynh5F6nwPf1PbTBdXTnNopLHN6Vcs27bxaI-0qtIqvYKrFKrTKr3KqwQsikAjKgA0KgBFKgBWKgptT094maUtNYquoB',
  /** 911836f (2판) 하나의 판 공유 — 5×5, 2줄 승리, 문항 24개 */
  v2Shared:
    'Tc89DkBgEIThq8jWW5j1fxZxI60EicQBqDRcCd8dKGRHpnm7J1ObShjbe-qj6xjObRbNFO9quZY9dCtEvzKvxCv1yrxyr8Kr9Kq8EDOpgAzogBAogRRogRioGTX7faJm1CyVRmO15gE',
  /** 911836f (2판) 각자 판 만들기 — 4×4, 3줄 승리 */
  v2Own: 'izbSUXo7q-dN91yF1ztnvtq8QEnHRMcACKNjdQx1jGMB',
}

function makeBoard(overrides: Partial<Board> = {}): Board {
  return { title: '회의 빙고', size: 5, targetLines: 2, nonce: '0123456789', ...overrides }
}

/** 링크 조각을 풀어 안에 든 배열을 그대로 본다 */
function rawOf(payload: string): unknown {
  const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4))
  return JSON.parse(strFromU8(inflateSync(Uint8Array.from(binary, (char) => char.charCodeAt(0)))))
}

/** 일부러 이상한 배열을 링크 조각으로 — 오류 처리를 보려고 쓴다 */
function payloadOf(packed: unknown): string {
  const bytes = deflateSync(strToU8(JSON.stringify(packed)))
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

describe('새 링크', () => {
  it('담은 설정을 그대로 돌려받는다', () => {
    const board = makeBoard()
    expect(decodeBoard(encodeBoard(board))).toEqual(board)
  })

  it('옛 자리를 비워 둔 채 끝에만 덧붙인다', () => {
    // 계약 3. 섞기·공짜 칸·문항·방식 자리를 당기면 이미 보낸 링크의 뜻이 바뀐다.
    const payload = encodeBoard(makeBoard({ title: '회식', size: 4, targetLines: 3, nonce: 'aa' }))
    expect(rawOf(payload)).toEqual([3, '회식', 4, 0, 0, [], 1, 3, 'aa'])
  })

  it('제목을 40자 꽉 채워도 링크가 짧다', () => {
    const payload = encodeBoard(makeBoard({ title: '가'.repeat(40) }))
    expect(payload.length).toBeLessThan(200)
  })
})

describe('boardIdOf — 판 식별', () => {
  it('같은 링크는 언제나 같은 id다', () => {
    // 이게 흔들리면 저장해 둔 내 판을 다시 찾지 못한다.
    expect(boardIdOf(makeBoard())).toBe(boardIdOf(makeBoard()))
    expect(boardIdOf(decodeBoard(encodeBoard(makeBoard())))).toBe(boardIdOf(makeBoard()))
  })

  it('설정이 같아도 임의 값이 다르면 다른 판이다', () => {
    // 없으면 "빙고 · 5×5 · 1줄" 초대 두 개가 한 기기에서 하나의 판으로 합쳐진다.
    const first = makeBoard({ nonce: 'aaaaaaaaaa' })
    const second = makeBoard({ nonce: 'bbbbbbbbbb' })
    expect(boardIdOf(first)).not.toBe(boardIdOf(second))
    expect(encodeBoard(first)).not.toBe(encodeBoard(second))
  })

  it('설정이 다르면 다른 판이다', () => {
    expect(boardIdOf(makeBoard({ size: 4 }))).not.toBe(boardIdOf(makeBoard({ size: 5 })))
    expect(boardIdOf(makeBoard({ targetLines: 1 }))).not.toBe(boardIdOf(makeBoard({ targetLines: 2 })))
  })
})

describe('newNonce — 링크 구분용 임의 값', () => {
  it('16진수 10자리다', () => {
    expect(newNonce()).toMatch(/^[0-9a-f]{10}$/)
  })

  it('부를 때마다 다르다', () => {
    const values = new Set(Array.from({ length: 100 }, () => newNonce()))
    expect(values.size).toBe(100)
  })
})

describe('옛 링크 — 이미 보낸 링크는 계속 열려야 한다', () => {
  it('1판 링크는 1줄 승리로 연다', () => {
    expect(decodeBoard(OLD_LINKS.v1)).toEqual({ title: '첫 회의 빙고', size: 5, targetLines: 1, nonce: '' })
  })

  it('2판 공유판 링크는 설정만 읽고 문항은 버린다', () => {
    // 이제 문항은 받은 사람이 채운다. 옛 링크의 문항을 끌어오지 않는다.
    expect(decodeBoard(OLD_LINKS.v2Shared)).toEqual({ title: '회의 빙고', size: 5, targetLines: 2, nonce: '' })
  })

  it('2판 각자 판 링크는 그대로 연다', () => {
    expect(decodeBoard(OLD_LINKS.v2Own)).toEqual({ title: '회식 빙고', size: 4, targetLines: 3, nonce: '' })
  })
})

describe('망가진 링크', () => {
  it('메신저에서 잘린 링크는 손상됐다고 알린다', () => {
    expect(() => decodeBoard(OLD_LINKS.v2Shared.slice(0, 30))).toThrow(/손상/)
  })

  it('아무 글자나 넣어도 손상됐다고 알린다', () => {
    expect(() => decodeBoard('이건-링크가-아님')).toThrow(/손상/)
  })

  it('더 새 버전의 링크는 그렇다고 알린다', () => {
    expect(() => decodeBoard(payloadOf([99, '미래', 5, 0, 0, [], 1, 1, 'x']))).toThrow(/지원하지 않는/)
  })

  it('판 크기가 3·4·5가 아니면 거절한다', () => {
    expect(() => decodeBoard(payloadOf([3, '큰 판', 6, 0, 0, [], 1, 1, 'x']))).toThrow(/크기/)
  })

  it('배열이 아니면 거절한다', () => {
    expect(() => decodeBoard(payloadOf({ title: '객체' }))).toThrow(/형태/)
  })

  it('승리 줄 수가 이상하면 1줄로 읽는다', () => {
    for (const bad of [0, -1, 2.5, '3', null]) {
      expect(decodeBoard(payloadOf([3, '판', 5, 0, 0, [], 1, bad, 'x'])).targetLines).toBe(1)
    }
  })

  it('제목이 비었으면 "빙고"로 읽는다', () => {
    expect(decodeBoard(payloadOf([3, '', 5, 0, 0, [], 1, 1, 'x'])).title).toBe('빙고')
  })
})
