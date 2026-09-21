import { parseCellInput } from '../lib/board'
import { SAMPLE_CELLS } from '../lib/samples'

type Props = {
  label: string
  value: string
  onChange: (next: string) => void
  /** 채워야 하는 칸 수 */
  required: number
  /** 칸 수보다 많이 적었을 때 무슨 일이 생기는지 알려주는 문구. 없으면 안내하지 않는다 */
  overflowHint?: (extra: number) => string
  showSample?: boolean
}

export default function CellsField({ label, value, onChange, required, overflowHint, showSample = true }: Props) {
  const cells = parseCellInput(value)
  const enough = cells.length >= required
  const extra = cells.length - required

  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-baseline justify-between text-sm font-medium">
        <span>{label}</span>
        <span className={enough ? 'text-ink-muted' : 'text-amber-600 dark:text-amber-400'}>
          {cells.length} / {required}
        </span>
      </span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={8}
        placeholder={'늦게 온 사람\n커피 쏟기\n같은 옷 두 명\n…'}
        className="resize-y rounded-lg border border-line bg-surface-sunken px-3 py-2.5 font-mono text-sm outline-none focus:border-accent"
      />
      <span className="text-xs text-ink-muted break-keep">
        여러 줄을 한 번에 붙여넣어도 됩니다. 빈 줄과 중복은 자동으로 걸러집니다.
        {overflowHint && extra > 0 ? ` ${overflowHint(extra)}` : ''}
      </span>
      {showSample && value.trim().length === 0 ? (
        <button
          type="button"
          onClick={() => onChange(SAMPLE_CELLS)}
          className="self-start text-xs font-medium text-accent underline underline-offset-2"
        >
          예시로 채우기
        </button>
      ) : null}
    </label>
  )
}
