import { describe, expect, it } from 'vitest'
import {
  cellCountOf,
  emptyCells,
  evaluateBingo,
  hasWon,
  isFilled,
  linesOf,
  parseCellInput,
} from './board'
import type { Board } from '../types'

function makeBoard(overrides: Partial<Board> = {}): Board {
  return {
    title: '테스트 판',
    size: 5,
    targetLines: 1,
    nonce: 'abc',
    ...overrides,
  }
}

describe('칸 수', () => {
  it('판 한 장의 칸 수는 size의 제곱이다', () => {
    expect(cellCountOf(3)).toBe(9)
    expect(cellCountOf(4)).toBe(16)
    expect(cellCountOf(5)).toBe(25)
  })

  it('빈 판은 칸 수만큼의 빈 문자열이다', () => {
    expect(emptyCells(3)).toEqual(['', '', '', '', '', '', '', '', ''])
    expect(emptyCells(5)).toHaveLength(25)
  })
})

describe('isFilled — 다 채웠는지', () => {
  it('모든 칸에 글자가 있으면 채운 것이다', () => {
    expect(isFilled(['가', '나', '다'])).toBe(true)
  })

  it('한 칸이라도 비면 아니다', () => {
    expect(isFilled(['가', '', '다'])).toBe(false)
  })

  it('공백만 있는 칸은 빈 칸으로 본다', () => {
    expect(isFilled(['가', '   ', '다'])).toBe(false)
  })
})

describe('linesOf — 줄 목록', () => {
  it('가로·세로 각 size줄에 대각선 둘이다', () => {
    expect(linesOf(3)).toHaveLength(8)
    expect(linesOf(4)).toHaveLength(10)
    expect(linesOf(5)).toHaveLength(12)
  })

  it('3×3의 줄을 정확히 집어낸다', () => {
    expect(linesOf(3)).toEqual([
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6],
    ])
  })

  it('모든 칸이 적어도 한 줄에 들어간다', () => {
    expect(new Set(linesOf(5).flat()).size).toBe(25)
  })
})

describe('evaluateBingo — 빙고 판정', () => {
  it('아무것도 안 찍으면 0줄이다', () => {
    const { lineCount, cellsInBingo } = evaluateBingo(3, new Set())
    expect(lineCount).toBe(0)
    expect(cellsInBingo.size).toBe(0)
  })

  it('가로 한 줄을 채우면 1줄로 센다', () => {
    const { lineCount, cellsInBingo } = evaluateBingo(3, new Set([0, 1, 2]))
    expect(lineCount).toBe(1)
    expect([...cellsInBingo].sort()).toEqual([0, 1, 2])
  })

  it('세로 한 줄도 센다', () => {
    expect(evaluateBingo(3, new Set([1, 4, 7])).lineCount).toBe(1)
  })

  it('대각선 두 방향 모두 센다', () => {
    expect(evaluateBingo(3, new Set([0, 4, 8])).lineCount).toBe(1)
    expect(evaluateBingo(3, new Set([2, 4, 6])).lineCount).toBe(1)
  })

  it('한 칸이라도 비면 줄로 치지 않는다', () => {
    expect(evaluateBingo(3, new Set([0, 1])).lineCount).toBe(0)
  })

  it('가운데 칸도 다른 칸과 똑같이 찍어야 한다', () => {
    // 공짜 칸이 없어졌으므로 가운데를 빼고는 대각선이 완성되지 않는다.
    expect(evaluateBingo(5, new Set([0, 6, 18, 24])).lineCount).toBe(0)
    expect(evaluateBingo(5, new Set([0, 6, 12, 18, 24])).lineCount).toBe(1)
  })

  it('겹치는 줄은 강조 칸을 합쳐서 돌려준다', () => {
    // 가로 [0,1,2]와 세로 [0,3,6]이 0번에서 만난다.
    const { lineCount, cellsInBingo } = evaluateBingo(3, new Set([0, 1, 2, 3, 6]))
    expect(lineCount).toBe(2)
    expect([...cellsInBingo].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 6])
  })

  it('전부 채우면 가능한 모든 줄이 된다', () => {
    const all = new Set(Array.from({ length: 9 }, (_, i) => i))
    const { lineCount, cellsInBingo } = evaluateBingo(3, all)
    expect(lineCount).toBe(8)
    expect(cellsInBingo.size).toBe(9)
  })

  it('판에 없는 칸 번호는 무시한다', () => {
    expect(evaluateBingo(3, new Set([0, 1, 2, 99])).lineCount).toBe(1)
  })
})

describe('hasWon — 승리 판정', () => {
  it('목표 줄 수에 닿으면 이긴다', () => {
    const board = makeBoard({ targetLines: 3 })
    expect(hasWon(board, 2)).toBe(false)
    expect(hasWon(board, 3)).toBe(true)
    expect(hasWon(board, 4)).toBe(true)
  })

  it('1줄 목표는 한 줄만 만들면 끝이다', () => {
    const board = makeBoard({ targetLines: 1 })
    expect(hasWon(board, 0)).toBe(false)
    expect(hasWon(board, 1)).toBe(true)
  })
})

describe('parseCellInput — 붙여넣기 해석', () => {
  it('줄 앞뒤 공백을 떼어낸다', () => {
    expect(parseCellInput('  가  \n 나 ')).toEqual(['가', '나'])
  })

  it('빈 줄을 걸러낸다', () => {
    expect(parseCellInput('가\n\n\n나')).toEqual(['가', '나'])
  })

  it('중복을 걸러내고 처음 순서를 지킨다', () => {
    expect(parseCellInput('가\n나\n가\n다')).toEqual(['가', '나', '다'])
  })

  it('공백만 다른 줄도 중복으로 본다', () => {
    expect(parseCellInput('가\n  가  ')).toEqual(['가'])
  })

  it('윈도우 줄바꿈(\\r\\n)도 읽는다', () => {
    expect(parseCellInput('가\r\n나\r\n다')).toEqual(['가', '나', '다'])
  })

  it('빈 입력은 빈 목록이다', () => {
    expect(parseCellInput('')).toEqual([])
    expect(parseCellInput('   \n  \n')).toEqual([])
  })
})
