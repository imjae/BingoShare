import { useLayoutEffect, useRef } from 'react'
import { largestFitting } from '../lib/fit'
import type { BoardSize } from '../types'

// 들어가는 한 가장 크게, 모자라면 여기까지 줄인다(px). 칸이 작은 5×5일수록 범위도 작다.
const FONT_RANGE: Record<BoardSize, { max: number; min: number }> = {
  3: { max: 16, min: 10 },
  4: { max: 14, min: 9 },
  5: { max: 12, min: 8 },
}

const STEP = 0.5
const LINE_HEIGHT = 1.25

type Props = {
  size: BoardSize
  text: string
  /** 최소 크기로도 다 안 들어가 `…`로 잘렸는지 알려준다 */
  onTruncatedChange?: (truncated: boolean) => void
}

/**
 * 칸 안에 글자를 **절대 넘치지 않게** 맞춘다. 부모는 `relative`여야 한다.
 *
 *   1. 단어를 자르지 않고 들어가는 가장 큰 크기
 *   2. 안 되면 단어 중간에서라도 줄을 바꿔 들어가는 가장 큰 크기
 *   3. 최소 크기로도 안 되면 칸 높이만큼만 보이고 `…`로 자른다
 *
 * 한국어는 단어 중간 줄바꿈이 읽기 나쁘므로(`break-keep`) 1을 먼저 시도한다.
 */
export default function CellText({ size, text, onTruncatedChange }: Props) {
  const boxRef = useRef<HTMLSpanElement>(null)
  const textRef = useRef<HTMLSpanElement>(null)
  const reportRef = useRef(onTruncatedChange)
  const lastTruncated = useRef<boolean | null>(null)

  // 부모가 매번 새 함수를 넘겨도 다시 재지 않도록 최신 콜백만 따로 들고 있는다.
  useLayoutEffect(() => {
    reportRef.current = onTruncatedChange
  })

  useLayoutEffect(() => {
    const box = boxRef.current
    const inner = textRef.current
    if (!box || !inner) {
      return
    }
    const { max, min } = FONT_RANGE[size]

    const apply = (fontSize: number, breakWords: boolean) => {
      inner.style.fontSize = `${fontSize}px`
      inner.style.overflowWrap = breakWords ? 'anywhere' : 'normal'
      inner.style.removeProperty('display')
      inner.style.removeProperty('-webkit-box-orient')
      inner.style.removeProperty('-webkit-line-clamp')
    }

    const overflows = () => inner.scrollWidth > inner.clientWidth || inner.offsetHeight > box.clientHeight

    const fit = () => {
      let breakWords = false
      let fontSize = largestFitting(min, max, STEP, (value) => {
        apply(value, false)
        return !overflows()
      })
      if (fontSize === null) {
        breakWords = true
        fontSize = largestFitting(min, max, STEP, (value) => {
          apply(value, true)
          return !overflows()
        })
      }

      const truncated = fontSize === null
      apply(fontSize ?? min, breakWords || truncated)
      if (truncated) {
        const lines = Math.max(1, Math.floor(box.clientHeight / (min * LINE_HEIGHT)))
        inner.style.setProperty('display', '-webkit-box')
        inner.style.setProperty('-webkit-box-orient', 'vertical')
        inner.style.setProperty('-webkit-line-clamp', String(lines))
      }

      if (lastTruncated.current !== truncated) {
        lastTruncated.current = truncated
        reportRef.current?.(truncated)
      }
    }

    fit()
    // 화면을 돌리거나 창 크기가 바뀌면 칸 크기도 바뀐다.
    const observer = new ResizeObserver(fit)
    observer.observe(box)
    return () => observer.disconnect()
  }, [size, text])

  return (
    <span ref={boxRef} className="absolute inset-1 flex items-center justify-center overflow-hidden">
      <span
        ref={textRef}
        className="block w-full overflow-hidden text-center break-keep"
        style={{ lineHeight: LINE_HEIGHT }}
      >
        {text}
      </span>
    </span>
  )
}
