import { useMemo, useState } from 'react'
import CellsField from '../components/CellsField'
import Layout, { Button, Notice } from '../components/Layout'
import { canUseFreeCenter, parseCellInput, requiredCellCount } from '../lib/board'
import { encodeBoard } from '../lib/encode'
import { goTo, shareUrlOf } from '../lib/route'
import { MAX_URL_LENGTH, targetLineOptions, type Board, type BoardSize, type GameMode } from '../types'

const SIZES: BoardSize[] = [3, 4, 5]

const MODE_INFO: Record<GameMode, { label: string; hint: string }> = {
  shared: {
    label: '하나의 판 공유',
    hint: '내가 문항을 정합니다. 참가자는 같은 문항으로 판을 받습니다.',
  },
  own: {
    label: '각자 판 만들기',
    hint: '초대만 합니다. 문항은 참가자가 각자 자기 것으로 채웁니다.',
  },
}

export default function CreateScreen() {
  const [mode, setMode] = useState<GameMode>('shared')
  const [title, setTitle] = useState('')
  const [size, setSize] = useState<BoardSize>(5)
  const [cellText, setCellText] = useState('')
  const [shuffle, setShuffle] = useState(true)
  const [freeCenter, setFreeCenter] = useState(true)
  const [targetLines, setTargetLines] = useState(1)
  const [error, setError] = useState<string | null>(null)

  const cells = useMemo(() => parseCellInput(cellText), [cellText])
  const freeCenterAvailable = canUseFreeCenter(size)
  const freeCenterOn = freeCenter && freeCenterAvailable
  const required = requiredCellCount(size, freeCenterOn)

  // 각자 판 모드는 문항을 여기서 받지 않으므로 언제나 만들 수 있다.
  const enough = mode === 'own' || cells.length >= required

  const lineChoices = targetLineOptions(size)
  const effectiveTarget = Math.min(targetLines, lineChoices[lineChoices.length - 1])

  const board = useMemo<Board>(
    () => ({
      version: 2,
      mode,
      title: title.trim() || '빙고',
      size,
      cells: mode === 'own' ? [] : cells,
      shuffle: mode === 'own' ? false : shuffle,
      freeCenter: freeCenterOn,
      targetLines: effectiveTarget,
    }),
    [mode, title, size, cells, shuffle, freeCenterOn, effectiveTarget],
  )

  // 링크가 너무 길어지면 메신저에서 잘린다. 만들기 화면에서 미리 알려준다.
  const urlLength = useMemo(() => {
    if (!enough) {
      return 0
    }
    try {
      return shareUrlOf(encodeBoard(board)).length
    } catch {
      return 0
    }
  }, [board, enough])

  function handleCreate() {
    if (!enough) {
      setError(`문항이 ${required - cells.length}개 모자랍니다.`)
      return
    }
    try {
      const payload = encodeBoard(board)
      if (shareUrlOf(payload).length > MAX_URL_LENGTH) {
        setError('링크가 너무 깁니다. 문항을 줄이거나 짧게 고쳐 주세요.')
        return
      }
      setError(null)
      goTo(`s=${payload}`)
    } catch {
      setError('링크를 만들지 못했습니다. 문항을 확인해 주세요.')
    }
  }

  return (
    <Layout title="BingoShare" subtitle="커스텀 빙고판을 만들어 링크 하나로 공유하세요.">
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">방식</span>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(MODE_INFO) as GameMode[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setMode(option)}
              className={[
                'rounded-lg border px-3 py-2.5 text-sm font-semibold transition-colors',
                mode === option ? 'border-accent bg-accent text-white' : 'border-line bg-surface-sunken text-ink',
              ].join(' ')}
            >
              {MODE_INFO[option].label}
            </button>
          ))}
        </div>
        <span className="text-xs text-ink-muted break-keep">{MODE_INFO[mode].hint}</span>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">제목</span>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="예: 월요일 회의 빙고"
          maxLength={40}
          className="rounded-lg border border-line bg-surface-sunken px-3 py-2.5 text-base outline-none focus:border-accent"
        />
      </label>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">판 크기</span>
        <div className="grid grid-cols-3 gap-2">
          {SIZES.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setSize(option)}
              className={[
                'rounded-lg border px-3 py-2.5 text-sm font-semibold transition-colors',
                size === option ? 'border-accent bg-accent text-white' : 'border-line bg-surface-sunken text-ink',
              ].join(' ')}
            >
              {option}×{option}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">승리 조건</span>
        <div className="grid grid-cols-5 gap-2">
          {lineChoices.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setTargetLines(option)}
              className={[
                'rounded-lg border px-2 py-2.5 text-sm font-semibold transition-colors',
                effectiveTarget === option
                  ? 'border-accent bg-accent text-white'
                  : 'border-line bg-surface-sunken text-ink',
              ].join(' ')}
            >
              {option}줄
            </button>
          ))}
        </div>
        <span className="text-xs text-ink-muted break-keep">
          {effectiveTarget}줄을 <strong className="font-semibold">먼저</strong> 만든 사람이 이깁니다.
        </span>
      </div>

      {mode === 'shared' ? (
        <CellsField
          label="문항 — 한 줄에 하나"
          value={cellText}
          onChange={setCellText}
          required={required}
          overflowHint={(extra) => `지금은 ${required}칸보다 ${extra}개 많아서, 참가자마다 뽑히는 문항이 달라집니다.`}
        />
      ) : (
        <Notice>
          문항은 참가자가 각자 채웁니다. 링크를 받은 사람이 이름을 적고 자기 문항 {required}개를 넣으면
          자기 판이 만들어집니다. 나도 링크를 열어 내 문항을 채우면 됩니다.
        </Notice>
      )}

      <div className="flex flex-col gap-2">
        {mode === 'shared' ? (
          <ToggleRow
            checked={shuffle}
            onChange={setShuffle}
            label="참가자마다 칸 섞기"
            hint="끄면 모두 똑같은 배치가 됩니다."
          />
        ) : null}
        <ToggleRow
          checked={freeCenterOn}
          onChange={setFreeCenter}
          disabled={!freeCenterAvailable}
          label="가운데 공짜 칸"
          hint={freeCenterAvailable ? '가운데 한 칸을 처음부터 채워 둡니다.' : '4×4는 가운데 칸이 없습니다.'}
        />
      </div>

      {error ? <Notice tone="error">{error}</Notice> : null}
      {enough && urlLength > MAX_URL_LENGTH * 0.8 && urlLength <= MAX_URL_LENGTH ? (
        <Notice tone="warn">링크 길이가 한계에 가깝습니다 ({urlLength}자). 문항을 조금 줄이는 게 안전합니다.</Notice>
      ) : null}

      <Button onClick={handleCreate} disabled={!enough}>
        {enough ? '링크 만들기' : `문항 ${required - cells.length}개 더 필요`}
      </Button>
    </Layout>
  )
}

function ToggleRow({
  checked,
  onChange,
  label,
  hint,
  disabled,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  label: string
  hint: string
  disabled?: boolean
}) {
  return (
    <label
      className={[
        'flex items-start gap-3 rounded-lg border border-line bg-surface-sunken px-3 py-2.5',
        disabled ? 'opacity-50' : '',
      ].join(' ')}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 size-4 accent-[var(--color-accent)]"
      />
      <span className="flex flex-col gap-0.5">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-xs text-ink-muted break-keep">{hint}</span>
      </span>
    </label>
  )
}
