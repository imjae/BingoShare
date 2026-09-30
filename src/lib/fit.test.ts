import { describe, expect, it, vi } from 'vitest'
import { largestFitting } from './fit'

/** 이 값 이하면 들어간다고 치는 가짜 측정 */
function fitsUpTo(limit: number) {
  return vi.fn((value: number) => value <= limit)
}

describe('largestFitting — 칸에 들어가는 가장 큰 글자 크기', () => {
  it('최대 크기가 들어가면 그대로 쓴다 — 짧은 문항', () => {
    const fits = fitsUpTo(99)
    expect(largestFitting(8, 16, 0.5, fits)).toBe(16)
    // 짧은 문항이 대부분이니 한 번 재고 끝나야 한다.
    expect(fits).toHaveBeenCalledOnce()
  })

  it('최소 크기로도 안 들어가면 null이다 — 줄여서 …로 자를 차례', () => {
    expect(largestFitting(8, 16, 0.5, fitsUpTo(7))).toBeNull()
  })

  it('중간 어딘가에서 들어가기 시작하면 그 경계를 찾는다', () => {
    expect(largestFitting(8, 16, 0.5, fitsUpTo(11.2))).toBe(11)
    expect(largestFitting(8, 16, 0.5, fitsUpTo(11.5))).toBe(11.5)
  })

  it('경계가 최소 크기 바로 위여도 찾는다', () => {
    expect(largestFitting(8, 16, 0.5, fitsUpTo(8))).toBe(8)
    expect(largestFitting(8, 16, 0.5, fitsUpTo(8.5))).toBe(8.5)
  })

  it('경계가 최대 크기 바로 아래여도 찾는다', () => {
    expect(largestFitting(8, 16, 0.5, fitsUpTo(15.5))).toBe(15.5)
  })

  it('측정을 이분 탐색 횟수만큼만 한다', () => {
    // 칸 25개를 매번 재므로 한 칸에서 여러 번 레이아웃을 강제하면 판이 버벅인다.
    for (let limit = 8; limit <= 16; limit += 0.5) {
      const fits = fitsUpTo(limit)
      largestFitting(8, 16, 0.5, fits)
      expect(fits.mock.calls.length).toBeLessThanOrEqual(7)
    }
  })
})
