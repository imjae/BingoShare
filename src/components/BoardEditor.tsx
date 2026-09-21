import { useEffect, useMemo, useRef, useState } from 'react'
import { cellSlotMap, parseCellInput, requiredCellCount } from '../lib/board'
import { SAMPLE_CELLS } from '../lib/samples'
import type { BoardSize } from '../types'

const GRID_COLUMNS: Record<BoardSize, string> = {
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  5: 'grid-cols-5',
}

const CELL_TEXT: Record<BoardSize, string> = {
  3: 'text-sm',
  4: 'text-xs',
  5: 'text-[10px]',
}

type Props = {
  size: BoardSize
  freeCenter: boolean
  /** 칸 수만큼의 문항. 아직 안 채운 칸은 빈 문자열 */
  values: string[]
  onChange: (next: string[]) => void
  /** 칸 수를 넘겨 붙여넣은 여분 문항 — 없으면 이 기능을 쓰지 않는다 */
  extras?: string[]
  onExtrasChange?: (next: string[]) => void
}

export default function BoardEditor({ size, freeCenter, values, onChange, extras, onExtrasChange }: Props) {
  const required = requiredCellCount(size, freeCenter)
  const slots = useMemo(() => cellSlotMap(size, freeCenter), [size, freeCenter])
  const [selected, setSelected] = useState<number | null>(null)
  const [pasteOpen, setPasteOpen] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // 칸을 고르면 바로 적을 수 있어야 한다. 폰에서는 이게 키보드를 띄우는 신호이기도 하다.
  useEffect(() => {
    if (selected !== null) {
      inputRef.current?.focus()
    }
  }, [selected])

  const filled = values.filter((value) => value.trim().length > 0).length

  function setValueAt(index: number, text: string) {
    const next = values.slice()
    while (next.length < required) {
      next.push('')
    }
    next[index] = text
    onChange(next)
  }

  /** 다음 빈 칸으로 넘어간다. 없으면 입력을 닫는다 */
  function advance(from: number) {
    for (let i = from + 1; i < required; i += 1) {
      if (!values[i]?.trim()) {
        setSelected(i)
        return
      }
    }
    for (let i = 0; i <= from; i += 1) {
      if (!values[i]?.trim()) {
        setSelected(i)
        return
      }
    }
    setSelected(null)
  }

  function applyPaste() {
    const lines = parseCellInput(pasteText)
    const next = Array.from({ length: required }, (_, i) => lines[i] ?? '')
    onChange(next)
    onExtrasChange?.(lines.slice(required))
    setPasteText('')
    setPasteOpen(false)
    setSelected(null)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between text-sm font-medium">
        <span>판 채우기</span>
        <span className={filled >= required ? 'text-ink-muted' : 'text-amber-600 dark:text-amber-400'}>
          {filled} / {required}
        </span>
      </div>

      <div className={`grid gap-1.5 ${GRID_COLUMNS[size]}`}>
        {slots.map((slot, position) => {
          if (slot === null) {
            return (
              <div
                key={position}
                className="flex aspect-square items-center justify-center rounded-md border border-line bg-surface-sunken text-[10px] font-medium text-ink-muted"
              >
                FREE
              </div>
            )
          }
          const text = values[slot] ?? ''
          const isSelected = selected === slot
          return (
            <button
              key={position}
              type="button"
              onClick={() => setSelected(slot)}
              className={[
                'flex aspect-square items-center justify-center rounded-md border p-1',
                'font-medium break-keep transition-colors',
                CELL_TEXT[size],
                isSelected
                  ? 'border-accent bg-accent/15 text-ink ring-2 ring-accent'
                  : text
                    ? 'border-line bg-surface-sunken text-ink'
                    : 'border-dashed border-line bg-transparent text-ink-muted',
              ].join(' ')}
            >
              {text || slot + 1}
            </button>
          )
        })}
      </div>

      {selected === null ? (
        <p className="text-xs text-ink-muted break-keep">
          칸을 눌러 문항을 적으세요. 적고 나서 <strong className="font-semibold">확인</strong>을 누르면 다음 빈
          칸으로 넘어갑니다.
        </p>
      ) : (
        <form
          className="flex flex-col gap-2 rounded-lg border border-accent bg-surface-sunken px-3 py-3"
          onSubmit={(event) => {
            event.preventDefault()
            advance(selected)
          }}
        >
          <span className="text-xs font-medium text-ink-muted">{selected + 1}번 칸</span>
          <input
            ref={inputRef}
            value={values[selected] ?? ''}
            onChange={(event) => setValueAt(selected, event.target.value)}
            placeholder="이 칸에 들어갈 문항"
            maxLength={30}
            enterKeyHint="next"
            className="rounded-lg border border-line bg-surface px-3 py-2.5 text-base outline-none focus:border-accent"
          />
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setSelected(Math.max(0, selected - 1))}
              disabled={selected === 0}
              className="rounded-lg border border-line px-2 py-2 text-xs font-semibold disabled:opacity-40"
            >
              이전 칸
            </button>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="rounded-lg border border-line px-2 py-2 text-xs font-semibold"
            >
              닫기
            </button>
            <button type="submit" className="rounded-lg bg-accent px-2 py-2 text-xs font-semibold text-white">
              확인
            </button>
          </div>
        </form>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setPasteOpen((open) => !open)}
          className="text-xs font-medium text-accent underline underline-offset-2"
        >
          여러 줄 한 번에 붙여넣기
        </button>
        {filled === 0 ? (
          <button
            type="button"
            onClick={() => {
              const lines = parseCellInput(SAMPLE_CELLS)
              onChange(Array.from({ length: required }, (_, i) => lines[i] ?? ''))
              onExtrasChange?.(lines.slice(required))
            }}
            className="text-xs font-medium text-accent underline underline-offset-2"
          >
            예시로 채우기
          </button>
        ) : null}
        {filled > 0 ? (
          <button
            type="button"
            onClick={() => {
              onChange(Array.from({ length: required }, () => ''))
              onExtrasChange?.([])
              setSelected(null)
            }}
            className="text-xs font-medium text-ink-muted underline underline-offset-2"
          >
            전부 비우기
          </button>
        ) : null}
      </div>

      {pasteOpen ? (
        <div className="flex flex-col gap-2 rounded-lg border border-line bg-surface-sunken px-3 py-3">
          <span className="text-xs text-ink-muted break-keep">
            한 줄에 하나씩. 위 칸부터 순서대로 채웁니다. 빈 줄과 중복은 걸러집니다.
          </span>
          <textarea
            value={pasteText}
            onChange={(event) => setPasteText(event.target.value)}
            rows={6}
            placeholder={'늦게 온 사람\n커피 쏟기\n같은 옷 두 명\n…'}
            className="resize-y rounded-lg border border-line bg-surface px-3 py-2.5 font-mono text-sm outline-none focus:border-accent"
          />
          <button
            type="button"
            onClick={applyPaste}
            disabled={parseCellInput(pasteText).length === 0}
            className="rounded-lg bg-accent px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
          >
            판에 채우기
          </button>
        </div>
      ) : null}

      {extras && extras.length > 0 ? (
        <div className="flex flex-col gap-2 rounded-lg border border-line bg-surface-sunken px-3 py-2.5">
          <span className="text-xs text-ink-muted break-keep">
            칸을 넘은 여분 {extras.length}개. 이게 있으면 참가자마다 뽑히는 문항이 달라집니다.
          </span>
          <div className="flex flex-wrap gap-1">
            {extras.map((item, index) => (
              <span key={index} className="rounded border border-line px-1.5 py-0.5 text-[10px] text-ink-muted">
                {item}
              </span>
            ))}
          </div>
          <button
            type="button"
            onClick={() => onExtrasChange?.([])}
            className="self-start text-xs font-medium text-ink-muted underline underline-offset-2"
          >
            여분 비우기
          </button>
        </div>
      ) : null}
    </div>
  )
}
