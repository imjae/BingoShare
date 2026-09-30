import { useEffect, useRef, useState } from 'react'
import CellText from './CellText'
import { cellCountOf, parseCellInput } from '../lib/board'
import { SAMPLE_CELLS } from '../lib/samples'
import { MAX_CELL_LENGTH, type BoardSize } from '../types'

const GRID_COLUMNS: Record<BoardSize, string> = {
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  5: 'grid-cols-5',
}

type Props = {
  size: BoardSize
  /** 칸 수만큼의 문항. 아직 안 채운 칸은 빈 문자열 */
  values: string[]
  onChange: (next: string[]) => void
}

export default function BoardEditor({ size, values, onChange }: Props) {
  const total = cellCountOf(size)
  const [selected, setSelected] = useState<number | null>(null)
  const [pasteOpen, setPasteOpen] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // 칸을 고르면 바로 적을 수 있어야 한다. 폰에서는 이게 키보드를 띄우는 신호이기도 하다.
  useEffect(() => {
    if (selected !== null) {
      inputRef.current?.focus()
    }
  }, [selected])

  const filled = values.filter((value) => value.trim().length > 0).length

  function setValueAt(index: number, text: string) {
    const next = Array.from({ length: total }, (_, i) => values[i] ?? '')
    next[index] = text
    onChange(next)
  }

  /** 다음 빈 칸으로 넘어간다. 없으면 입력을 닫는다 */
  function advance(from: number) {
    for (let i = from + 1; i < total; i += 1) {
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

  function fillFrom(lines: string[]) {
    onChange(Array.from({ length: total }, (_, i) => lines[i] ?? ''))
    setSelected(null)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between text-sm font-medium">
        <span>판 채우기</span>
        <span className={filled >= total ? 'text-ink-muted' : 'text-amber-600 dark:text-amber-400'}>
          {filled} / {total}
        </span>
      </div>

      <div className={`grid gap-1.5 ${GRID_COLUMNS[size]}`}>
        {Array.from({ length: total }, (_, index) => {
          const text = values[index] ?? ''
          const isSelected = selected === index
          return (
            <button
              key={index}
              type="button"
              onClick={() => setSelected(index)}
              className={[
                'relative aspect-square rounded-md border font-medium transition-colors',
                isSelected
                  ? 'border-accent bg-accent/15 text-ink ring-2 ring-accent'
                  : text
                    ? 'border-line bg-surface-sunken text-ink'
                    : 'border-dashed border-line bg-transparent text-ink-muted',
              ].join(' ')}
            >
              <CellText size={size} text={text || String(index + 1)} />
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
          <div className="flex items-baseline justify-between text-xs font-medium text-ink-muted">
            <span>{selected + 1}번 칸</span>
            <span>
              {(values[selected] ?? '').length} / {MAX_CELL_LENGTH}
            </span>
          </div>
          {/* 긴 문항을 한눈에 보도록 두 줄짜리 입력칸. 문항 자체는 한 줄이라 줄바꿈은 넣지 않는다 */}
          <textarea
            ref={inputRef}
            value={values[selected] ?? ''}
            onChange={(event) => setValueAt(selected, event.target.value.replace(/\s*\n\s*/g, ' '))}
            onKeyDown={(event) => {
              // 엔터는 줄바꿈 대신 다음 칸으로. 한글 조합 중의 엔터는 조합을 끝내는 것이라 건드리지 않는다.
              if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
                event.preventDefault()
                advance(selected)
              }
            }}
            placeholder="이 칸에 들어갈 문항"
            rows={2}
            maxLength={MAX_CELL_LENGTH}
            enterKeyHint="next"
            className="resize-none rounded-lg border border-line bg-surface px-3 py-2.5 text-base break-keep outline-none focus:border-accent"
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
            onClick={() => fillFrom(parseCellInput(SAMPLE_CELLS))}
            className="text-xs font-medium text-accent underline underline-offset-2"
          >
            예시로 채우기
          </button>
        ) : null}
        {filled > 0 ? (
          <button
            type="button"
            onClick={() => fillFrom([])}
            className="text-xs font-medium text-ink-muted underline underline-offset-2"
          >
            전부 비우기
          </button>
        ) : null}
      </div>

      {pasteOpen ? (
        <div className="flex flex-col gap-2 rounded-lg border border-line bg-surface-sunken px-3 py-3">
          <span className="text-xs text-ink-muted break-keep">
            한 줄에 하나씩. 위 칸부터 순서대로 채웁니다. 빈 줄과 중복은 걸러지고, 칸 수를 넘는 줄은 버려집니다.
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
            onClick={() => {
              fillFrom(parseCellInput(pasteText))
              setPasteText('')
              setPasteOpen(false)
            }}
            disabled={parseCellInput(pasteText).length === 0}
            className="rounded-lg bg-accent px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
          >
            판에 채우기
          </button>
        </div>
      ) : null}
    </div>
  )
}
