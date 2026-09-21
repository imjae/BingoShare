import { useMemo, useState } from 'react'
import BoardEditor from '../components/BoardEditor'
import Layout, { Button, Notice } from '../components/Layout'
import { canUseFreeCenter, requiredCellCount } from '../lib/board'
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

type Step = 'setup' | 'fill'

export default function CreateScreen() {
  const [step, setStep] = useState<Step>('setup')
  const [mode, setMode] = useState<GameMode>('shared')
  const [title, setTitle] = useState('')
  const [size, setSize] = useState<BoardSize>(5)
  const [shuffle, setShuffle] = useState(true)
  const [freeCenter, setFreeCenter] = useState(true)
  const [targetLines, setTargetLines] = useState(1)
  const [cellValues, setCellValues] = useState<string[]>([])
  const [extras, setExtras] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  const freeCenterAvailable = canUseFreeCenter(size)
  const freeCenterOn = freeCenter && freeCenterAvailable
  const required = requiredCellCount(size, freeCenterOn)

  const lineChoices = targetLineOptions(size)
  const effectiveTarget = Math.min(targetLines, lineChoices[lineChoices.length - 1])

  const placedCells = useMemo(
    () => Array.from({ length: required }, (_, i) => cellValues[i]?.trim() ?? '').filter((cell) => cell.length > 0),
    [cellValues, required],
  )
  const filledAll = placedCells.length >= required

  const board = useMemo<Board>(
    () => ({
      version: 2,
      mode,
      title: title.trim() || '빙고',
      size,
      cells: mode === 'own' ? [] : [...placedCells, ...extras],
      shuffle: mode === 'own' ? false : shuffle,
      freeCenter: freeCenterOn,
      targetLines: effectiveTarget,
    }),
    [mode, title, size, placedCells, extras, shuffle, freeCenterOn, effectiveTarget],
  )

  const ready = mode === 'own' || filledAll

  // 링크가 너무 길어지면 메신저에서 잘린다. 만들기 화면에서 미리 알려준다.
  const urlLength = useMemo(() => {
    if (!ready) {
      return 0
    }
    try {
      return shareUrlOf(encodeBoard(board)).length
    } catch {
      return 0
    }
  }, [board, ready])

  function handleCreate() {
    try {
      const payload = encodeBoard(board)
      if (shareUrlOf(payload).length > MAX_URL_LENGTH) {
        setError('링크가 너무 깁니다. 문항을 짧게 고치거나 여분을 줄여 주세요.')
        return
      }
      setError(null)
      goTo(`s=${payload}`)
    } catch {
      setError('링크를 만들지 못했습니다. 문항을 확인해 주세요.')
    }
  }

  if (step === 'fill') {
    return (
      <Layout title={board.title} subtitle={`${size}×${size} 판 · ${effectiveTarget}줄이면 승리`}>
        {shuffle ? (
          <Notice>
            칸 섞기가 켜져 있어서 참가자는 이 배치를 그대로 받지 않습니다. 여기서 정한 자리는 내가 보기 편하라고
            있는 것이고, 실제 자리는 사람마다 달라집니다.
          </Notice>
        ) : (
          <Notice>칸 섞기가 꺼져 있어서 참가자 모두 지금 이 배치 그대로 받습니다.</Notice>
        )}

        <BoardEditor
          size={size}
          freeCenter={freeCenterOn}
          values={cellValues}
          onChange={setCellValues}
          extras={extras}
          onExtrasChange={setExtras}
        />

        {error ? <Notice tone="error">{error}</Notice> : null}
        {ready && urlLength > MAX_URL_LENGTH * 0.8 && urlLength <= MAX_URL_LENGTH ? (
          <Notice tone="warn">링크 길이가 한계에 가깝습니다 ({urlLength}자). 문항을 조금 줄이는 게 안전합니다.</Notice>
        ) : null}

        <div className="mt-2 flex flex-col gap-2">
          <Button onClick={handleCreate} disabled={!filledAll}>
            {filledAll ? '링크 만들기' : `${required - placedCells.length}칸 더 채우기`}
          </Button>
          <Button variant="secondary" onClick={() => setStep('setup')}>
            설정으로 돌아가기
          </Button>
        </div>
      </Layout>
    )
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

      {mode === 'own' ? (
        <Notice>
          문항은 참가자가 각자 채웁니다. 링크를 받은 사람이 이름을 적고 빈 판에서 자기 문항 {required}개를 채우면
          자기 판이 만들어집니다. 나도 링크를 열어 내 판을 채우면 됩니다.
        </Notice>
      ) : null}

      {error ? <Notice tone="error">{error}</Notice> : null}

      <Button
        onClick={() => {
          setError(null)
          if (mode === 'own') {
            handleCreate()
          } else {
            setStep('fill')
          }
        }}
      >
        {mode === 'own' ? '초대 링크 만들기' : '판 채우러 가기'}
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
