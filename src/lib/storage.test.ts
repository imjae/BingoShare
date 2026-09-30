import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { listMyBoards, loadMyBoard, requestPersistence, saveMyBoard } from './storage'
import type { MyBoard } from '../types'

/** 브라우저의 localStorage를 흉내 낸다. 테스트는 브라우저 없이 돈다 */
class MemoryStorage {
  private readonly items = new Map<string, string>()

  get length(): number {
    return this.items.size
  }

  key(index: number): string | null {
    return [...this.items.keys()][index] ?? null
  }

  getItem(key: string): string | null {
    return this.items.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.items.set(key, value)
  }

  removeItem(key: string): void {
    this.items.delete(key)
  }
}

/** 사생활 보호 모드처럼 모든 접근에서 예외를 던진다 */
class BlockedStorage {
  get length(): number {
    throw new Error('SecurityError')
  }

  key(): string | null {
    throw new Error('SecurityError')
  }

  getItem(): string | null {
    throw new Error('SecurityError')
  }

  setItem(): void {
    throw new Error('QuotaExceededError')
  }
}

let store: MemoryStorage

beforeEach(() => {
  store = new MemoryStorage()
  vi.stubGlobal('window', { localStorage: store })
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const SAMPLE: MyBoard = {
  name: '철수',
  cells: ['가', '나', '다', '라', '마', '바', '사', '아', '자'],
  checked: [0, 4, 8],
}

describe('저장과 불러오기', () => {
  it('저장한 판을 그대로 돌려받는다', () => {
    expect(saveMyBoard('board-1', 'payload-1', SAMPLE)).toBe(true)
    expect(loadMyBoard('board-1', 3)).toEqual(SAMPLE)
  })

  it('저장한 적 없으면 null이다', () => {
    expect(loadMyBoard('없는-판', 3)).toBeNull()
  })

  it('판마다 따로 저장된다', () => {
    saveMyBoard('board-1', 'p1', SAMPLE)
    saveMyBoard('board-2', 'p2', { ...SAMPLE, name: '다른 사람' })
    expect(loadMyBoard('board-1', 3)?.name).toBe('철수')
    expect(loadMyBoard('board-2', 3)?.name).toBe('다른 사람')
  })

  it('문항을 고쳐 다시 저장해도 체크는 그대로다', () => {
    saveMyBoard('board-1', 'p1', SAMPLE)
    const edited = { ...SAMPLE, cells: SAMPLE.cells.map((cell, i) => (i === 4 ? '고친 문항' : cell)) }
    saveMyBoard('board-1', 'p1', edited)
    const loaded = loadMyBoard('board-1', 3)
    expect(loaded?.cells[4]).toBe('고친 문항')
    expect(loaded?.checked).toEqual([0, 4, 8])
  })
})

describe('불러올 때 모양을 맞춘다', () => {
  function saveRaw(value: unknown) {
    store.setItem('bingoshare:mine:board-1', JSON.stringify(value))
  }

  it('칸이 모자라면 빈 칸으로 채운다', () => {
    saveRaw({ payload: 'p', name: '철수', cells: ['가', '나'], checked: [] })
    expect(loadMyBoard('board-1', 3)?.cells).toEqual(['가', '나', '', '', '', '', '', '', ''])
  })

  it('칸이 넘치면 판 크기만큼 자른다', () => {
    saveRaw({ payload: 'p', name: '철수', cells: Array.from({ length: 30 }, () => '칸'), checked: [] })
    expect(loadMyBoard('board-1', 3)?.cells).toHaveLength(9)
  })

  it('판 밖의 체크와 중복, 정수가 아닌 값은 버리고 정렬한다', () => {
    saveRaw({ payload: 'p', name: '철수', cells: [], checked: [8, 2, 2, -1, 9, 99, 1.5, '3'] })
    expect(loadMyBoard('board-1', 3)?.checked).toEqual([2, 8])
  })

  it('문자열이 아닌 문항은 빈 칸으로 본다', () => {
    saveRaw({ payload: 'p', name: '철수', cells: ['가', 42, null], checked: [] })
    expect(loadMyBoard('board-1', 3)?.cells.slice(0, 3)).toEqual(['가', '', ''])
  })

  it('JSON이 깨졌으면 null이다', () => {
    store.setItem('bingoshare:mine:board-1', '{깨진')
    expect(loadMyBoard('board-1', 3)).toBeNull()
  })

  it('링크 조각이 없으면 null이다 — 목록에서 다시 열 수 없기 때문이다', () => {
    saveRaw({ name: '철수', cells: [], checked: [] })
    expect(loadMyBoard('board-1', 3)).toBeNull()
  })
})

describe('listMyBoards — 이 기기에 저장된 판 목록', () => {
  it('최근에 만진 것부터 준다', () => {
    const now = vi.spyOn(Date, 'now')
    now.mockReturnValue(1000)
    saveMyBoard('old', 'p-old', SAMPLE)
    now.mockReturnValue(3000)
    saveMyBoard('new', 'p-new', SAMPLE)
    now.mockReturnValue(2000)
    saveMyBoard('mid', 'p-mid', SAMPLE)

    expect(listMyBoards().map((entry) => entry.boardId)).toEqual(['new', 'mid', 'old'])
  })

  it('다시 열 수 있게 링크 조각을 함께 준다', () => {
    saveMyBoard('board-1', 'payload-1', SAMPLE)
    expect(listMyBoards()[0]).toMatchObject({ boardId: 'board-1', payload: 'payload-1', name: '철수' })
  })

  it('남의 키와 간소화 전의 옛 키는 건드리지 않는다', () => {
    // imjae.github.io는 다른 저장소의 페이지와 저장소를 같이 쓴다.
    store.setItem('other-app:settings', '{}')
    store.setItem('bingoshare:progress:abc:철수', '[1,2]')
    store.setItem('bingoshare:name:abc', '철수')
    saveMyBoard('board-1', 'p1', SAMPLE)

    expect(listMyBoards().map((entry) => entry.boardId)).toEqual(['board-1'])
  })

  it('망가진 항목은 건너뛴다', () => {
    store.setItem('bingoshare:mine:broken', '{깨진')
    saveMyBoard('board-1', 'p1', SAMPLE)
    expect(listMyBoards().map((entry) => entry.boardId)).toEqual(['board-1'])
  })
})

describe('저장이 막힌 브라우저 — 앱이 멈추면 안 된다', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { localStorage: new BlockedStorage() })
  })

  it('불러오기는 null이다', () => {
    expect(loadMyBoard('board-1', 3)).toBeNull()
  })

  it('저장은 실패했다고 알린다 — 화면이 사용자에게 경고해야 한다', () => {
    expect(saveMyBoard('board-1', 'p1', SAMPLE)).toBe(false)
  })

  it('목록은 비어 있다', () => {
    expect(listMyBoards()).toEqual([])
  })

  it('localStorage에 손대는 것만으로 예외가 나도 버틴다', () => {
    // 쿠키를 막은 사파리는 window.localStorage를 읽는 순간 예외를 던진다.
    vi.stubGlobal('window', {
      get localStorage(): Storage {
        throw new Error('SecurityError')
      },
    })
    expect(loadMyBoard('board-1', 3)).toBeNull()
    expect(saveMyBoard('board-1', 'p1', SAMPLE)).toBe(false)
    expect(listMyBoards()).toEqual([])
  })
})

describe('requestPersistence', () => {
  it('지원하지 않는 브라우저에서도 조용히 넘어간다', () => {
    vi.stubGlobal('navigator', {})
    expect(() => requestPersistence()).not.toThrow()
  })

  it('거절돼도 조용히 넘어간다', async () => {
    const persist = vi.fn().mockRejectedValue(new Error('거절'))
    vi.stubGlobal('navigator', { storage: { persist } })
    requestPersistence()
    await Promise.resolve()
    expect(persist).toHaveBeenCalledOnce()
  })
})
