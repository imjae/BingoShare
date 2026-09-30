/**
 * [min, max] 사이에서 step 간격으로, `fits`가 참인 **가장 큰 값**을 찾는다. 하나도 없으면 null.
 *
 * 칸에 글자를 맞출 때 쓴다 — 글자가 작을수록 잘 들어간다(단조)는 가정으로 이분 탐색한다.
 * `fits`는 매번 레이아웃을 다시 재므로 부르는 횟수를 줄이는 게 중요하다. 짧은 문항이 대부분이라
 * 최대 크기부터 먼저 본다.
 */
export function largestFitting(
  min: number,
  max: number,
  step: number,
  fits: (value: number) => boolean,
): number | null {
  if (fits(max)) {
    return max
  }
  if (!fits(min)) {
    return null
  }
  // 불변식: min + low*step 은 들어가고, min + (high+1)*step 은 안 들어간다.
  let low = 0
  let high = Math.round((max - min) / step) - 1
  while (low < high) {
    const mid = Math.ceil((low + high) / 2)
    if (fits(min + mid * step)) {
      low = mid
    } else {
      high = mid - 1
    }
  }
  return min + low * step
}
