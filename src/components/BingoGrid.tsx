import { useEffect, useRef, useState } from 'react'
import CellText from './CellText'
import { Button } from './Layout'
import type { BoardSize } from '../types'

const GRID_COLUMNS: Record<BoardSize, string> = {
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  5: 'grid-cols-5',
}

/** 이만큼 누르고 있으면 체크 대신 전체 문항을 보여준다 */
const LONG_PRESS_MS = 450

type Props = {
  size: BoardSize
  cells: string[]
  checked: ReadonlySet<number>
  cellsInBingo: ReadonlySet<number>
  onToggle: (index: number) => void
}

export default function BingoGrid({ size, cells, checked, cellsInBingo, onToggle }: Props) {
  const [detail, setDetail] = useState<number | null>(null)
  const [truncated, setTruncated] = useState<ReadonlySet<number>>(() => new Set())
  const pressTimer = useRef<number | null>(null)
  const longPressed = useRef(false)

  function cancelPress() {
    if (pressTimer.current !== null) {
      window.clearTimeout(pressTimer.current)
      pressTimer.current = null
    }
  }

  function startPress(index: number) {
    cancelPress()
    longPressed.current = false
    pressTimer.current = window.setTimeout(() => {
      pressTimer.current = null
      longPressed.current = true
      setDetail(index)
    }, LONG_PRESS_MS)
  }

  function markTruncated(index: number, value: boolean) {
    setTruncated((prev) => {
      if (prev.has(index) === value) {
        return prev
      }
      const next = new Set(prev)
      if (value) {
        next.add(index)
      } else {
        next.delete(index)
      }
      return next
    })
  }

  // 화면을 떠날 때 누르던 중이었으면 타이머를 치운다.
  useEffect(() => cancelPress, [])

  useEffect(() => {
    if (detail === null) {
      return
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setDetail(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [detail])

  return (
    <div className="flex flex-col gap-2">
      <div className={`grid gap-1.5 ${GRID_COLUMNS[size]}`}>
        {cells.map((cell, index) => {
          const isChecked = checked.has(index)
          const isInBingo = cellsInBingo.has(index)

          return (
            <button
              key={index}
              type="button"
              onPointerDown={() => startPress(index)}
              onPointerUp={cancelPress}
              onPointerLeave={cancelPress}
              onPointerCancel={cancelPress}
              // 길게 누를 때 뜨는 복사·공유 메뉴를 막는다
              onContextMenu={(event) => event.preventDefault()}
              onClick={() => {
                // 길게 눌러 창을 연 경우엔 손을 떼도 체크하지 않는다.
                if (longPressed.current) {
                  longPressed.current = false
                  return
                }
                onToggle(index)
              }}
              aria-pressed={isChecked}
              aria-label={cell || '빈 칸'}
              title={cell}
              className={[
                'relative aspect-square cursor-pointer rounded-md border font-medium select-none',
                'transition-colors [-webkit-touch-callout:none] active:scale-95',
                isChecked
                  ? isInBingo
                    ? 'border-amber-400 bg-amber-400 text-amber-950'
                    : 'border-accent bg-accent text-white'
                  : 'border-line bg-surface-sunken text-ink',
              ].join(' ')}
            >
              <CellText size={size} text={cell} onTruncatedChange={(value) => markTruncated(index, value)} />
            </button>
          )
        })}
      </div>

      {truncated.size > 0 ? (
        <p className="text-xs text-ink-muted break-keep">
          글이 잘린 칸은 <strong className="font-semibold">길게 누르면</strong> 전체가 보입니다.
        </p>
      ) : null}

      {detail !== null ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${detail + 1}번 칸`}
          className="fixed inset-0 z-10 flex items-center justify-center bg-black/50 px-6"
        >
          <div className="flex w-full max-w-sm flex-col gap-4 rounded-xl border border-line bg-surface p-5 text-ink">
            <span className="text-xs font-medium text-ink-muted">
              {detail + 1}번 칸{checked.has(detail) ? ' · 체크함' : ''}
            </span>
            <p className="text-lg font-semibold break-keep [overflow-wrap:anywhere]">{cells[detail]}</p>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" onClick={() => setDetail(null)}>
                닫기
              </Button>
              <Button
                onClick={() => {
                  onToggle(detail)
                  setDetail(null)
                }}
              >
                {checked.has(detail) ? '체크 풀기' : '체크하기'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
