import type { BoardSize } from '../types'

const GRID_COLUMNS: Record<BoardSize, string> = {
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  5: 'grid-cols-5',
}

// 칸이 작아질수록 글자도 줄인다. 5×5에 3×3 글자 크기를 쓰면 문항이 잘린다.
const CELL_TEXT: Record<BoardSize, string> = {
  3: 'text-sm',
  4: 'text-xs',
  5: 'text-[10px]',
}

type Props = {
  size: BoardSize
  cells: string[]
  checked: ReadonlySet<number>
  cellsInBingo: ReadonlySet<number>
  onToggle: (index: number) => void
}

export default function BingoGrid({ size, cells, checked, cellsInBingo, onToggle }: Props) {
  return (
    <div className={`grid gap-1.5 ${GRID_COLUMNS[size]}`}>
      {cells.map((cell, index) => {
        const isChecked = checked.has(index)
        const isInBingo = cellsInBingo.has(index)

        return (
          <button
            key={index}
            type="button"
            onClick={() => onToggle(index)}
            aria-pressed={isChecked}
            aria-label={cell || '빈 칸'}
            className={[
              'flex aspect-square cursor-pointer items-center justify-center rounded-md border p-1',
              'font-medium break-keep transition-colors active:scale-95',
              CELL_TEXT[size],
              isChecked
                ? isInBingo
                  ? 'border-amber-400 bg-amber-400 text-amber-950'
                  : 'border-accent bg-accent text-white'
                : 'border-line bg-surface-sunken text-ink',
            ].join(' ')}
          >
            {cell}
          </button>
        )
      })}
    </div>
  )
}
