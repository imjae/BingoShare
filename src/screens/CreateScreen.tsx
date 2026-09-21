import { useMemo, useState } from 'react'
import Layout, { Button, Notice } from '../components/Layout'
import { canUseFreeCenter, parseCellInput, requiredCellCount } from '../lib/board'
import { encodeBoard } from '../lib/encode'
import { goTo, shareUrlOf } from '../lib/route'
import { MAX_URL_LENGTH, type Board, type BoardSize } from '../types'

const SIZES: BoardSize[] = [3, 4, 5]

const SAMPLE = [
  '늦게 온 사람',
  '커피 쏟기',
  '같은 옷 두 명',
  '전화 받으러 나감',
  '노트북 배터리 방전',
  '회의 5분 초과',
  '오타 난 슬라이드',
  '핸드폰 진동',
  '갑자기 조용해짐',
  '화면 공유 실패',
  '누가 물 마심',
  '창밖 쳐다보기',
  '이름 잘못 부름',
  '간식 등장',
  '마이크 음소거',
  '펜 안 나옴',
  '의자 삐걱',
  '하품',
  '문 잘못 열림',
  '자료 못 찾음',
  '다음에 얘기하죠',
  '시계 보기',
  '엘리베이터 대기',
  '단체 사진',
].join('\n')

export default function CreateScreen() {
  const [title, setTitle] = useState('')
  const [size, setSize] = useState<BoardSize>(5)
  const [cellText, setCellText] = useState('')
  const [shuffle, setShuffle] = useState(true)
  const [freeCenter, setFreeCenter] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const cells = useMemo(() => parseCellInput(cellText), [cellText])
  const freeCenterAvailable = canUseFreeCenter(size)
  const freeCenterOn = freeCenter && freeCenterAvailable
  const required = requiredCellCount(size, freeCenterOn)
  const enough = cells.length >= required

  const board = useMemo<Board>(
    () => ({
      version: 1,
      title: title.trim() || '빙고',
      size,
      cells,
      shuffle,
      freeCenter: freeCenterOn,
    }),
    [title, size, cells, shuffle, freeCenterOn],
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
                size === option
                  ? 'border-accent bg-accent text-white'
                  : 'border-line bg-surface-sunken text-ink',
              ].join(' ')}
            >
              {option}×{option}
            </button>
          ))}
        </div>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="flex items-baseline justify-between text-sm font-medium">
          <span>문항 — 한 줄에 하나</span>
          <span className={enough ? 'text-ink-muted' : 'text-amber-600 dark:text-amber-400'}>
            {cells.length} / {required}
          </span>
        </span>
        <textarea
          value={cellText}
          onChange={(event) => setCellText(event.target.value)}
          rows={8}
          placeholder={'늦게 온 사람\n커피 쏟기\n같은 옷 두 명\n…'}
          className="resize-y rounded-lg border border-line bg-surface-sunken px-3 py-2.5 font-mono text-sm outline-none focus:border-accent"
        />
        <span className="text-xs text-ink-muted">
          여러 줄을 한 번에 붙여넣어도 됩니다. 빈 줄과 중복은 자동으로 걸러집니다.
          {cells.length > required
            ? ` 지금은 ${required}칸보다 ${cells.length - required}개 많아서, 참가자마다 뽑히는 문항이 달라집니다.`
            : ''}
        </span>
        {cellText.trim().length === 0 ? (
          <button
            type="button"
            onClick={() => setCellText(SAMPLE)}
            className="self-start text-xs font-medium text-accent underline underline-offset-2"
          >
            예시로 채우기
          </button>
        ) : null}
      </label>

      <div className="flex flex-col gap-2">
        <ToggleRow
          checked={shuffle}
          onChange={setShuffle}
          label="참가자마다 칸 섞기"
          hint="끄면 모두 똑같은 배치가 됩니다."
        />
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
