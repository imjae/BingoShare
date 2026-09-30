import { useMemo, useState } from 'react'
import BingoGrid from '../components/BingoGrid'
import BoardEditor from '../components/BoardEditor'
import Layout, { Button, Notice } from '../components/Layout'
import { cellCountOf, emptyCells, evaluateBingo, hasWon, isFilled } from '../lib/board'
import { boardIdOf, decodeBoard } from '../lib/encode'
import { goTo, shareUrlOf } from '../lib/route'
import { loadMyBoard, requestPersistence, saveMyBoard } from '../lib/storage'
import type { Board, MyBoard } from '../types'

type Props = { payload: string }

export default function PlayScreen({ payload }: Props) {
  const decoded = useMemo(() => {
    try {
      return { board: decodeBoard(payload), error: null as string | null }
    } catch (error) {
      return { board: null, error: error instanceof Error ? error.message : '링크를 읽지 못했습니다.' }
    }
  }, [payload])

  if (!decoded.board) {
    return (
      <Layout title="링크를 열지 못했습니다">
        <Notice tone="error">{decoded.error}</Notice>
        <Button onClick={() => goTo('')}>처음 화면으로</Button>
      </Layout>
    )
  }

  // 링크가 바뀌면 다른 판이다. key를 주지 않으면 React가 같은 화면을 재사용해서
  // 앞 판의 이름과 문항이 그대로 남는다.
  return <PlayBoard key={payload} board={decoded.board} payload={payload} />
}

/**
 *   fill — 처음 채우는 중 (다 채워야 시작할 수 있다)
 *   edit — 진행하다가 문항을 고치는 중
 *   play — 체크하며 진행
 */
type Mode = 'fill' | 'edit' | 'play'

function PlayBoard({ board, payload }: { board: Board; payload: string }) {
  const boardId = useMemo(() => boardIdOf(board), [board])
  const [mine, setMine] = useState<MyBoard | null>(() => loadMyBoard(boardId, board.size))
  const [mode, setMode] = useState<Mode>(() => (mine && isFilled(mine.cells) ? 'play' : 'fill'))
  const [renaming, setRenaming] = useState(false)
  const [saveFailed, setSaveFailed] = useState(false)

  // 바뀔 때마다 바로 저장한다. 저장 버튼을 따로 두지 않는다 — 누르는 걸 잊으면 판이 사라진다.
  function update(next: MyBoard) {
    setMine(next)
    setSaveFailed(!saveMyBoard(boardId, payload, next))
  }

  if (!mine || !mine.name || renaming) {
    return (
      <NameForm
        board={board}
        initialName={mine?.name ?? ''}
        onSubmit={(name) => {
          if (!mine) {
            requestPersistence()
          }
          update(mine ? { ...mine, name } : { name, cells: emptyCells(board.size), checked: [] })
          setRenaming(false)
        }}
        onCancel={mine?.name ? () => setRenaming(false) : undefined}
      />
    )
  }

  if (mode !== 'play') {
    return (
      <EditView
        board={board}
        mine={mine}
        revising={mode === 'edit'}
        saveFailed={saveFailed}
        onChange={update}
        onDone={() => setMode('play')}
      />
    )
  }

  return (
    <PlayView
      board={board}
      payload={payload}
      mine={mine}
      saveFailed={saveFailed}
      onChange={update}
      onEdit={() => setMode('edit')}
      onRename={() => setRenaming(true)}
    />
  )
}

function NameForm({
  board,
  initialName,
  onSubmit,
  onCancel,
}: {
  board: Board
  initialName: string
  onSubmit: (name: string) => void
  /** 있으면 이름 바꾸기, 없으면 처음 참가 */
  onCancel?: () => void
}) {
  const [name, setName] = useState(initialName)
  const trimmed = name.trim()
  const renaming = onCancel !== undefined

  return (
    <Layout title={board.title} subtitle={renaming ? '이름 바꾸기' : '이름을 적으면 내 판이 만들어집니다.'}>
      <Notice>
        {renaming
          ? '이름만 바뀝니다. 채운 문항과 체크는 그대로입니다.'
          : '초대된 판입니다. 이름을 적고 내 문항을 채우면 내 판이 만들어집니다.'}
      </Notice>
      <Notice tone="warn">
        {board.size}×{board.size} 판 · {board.targetLines}줄을 먼저 만든 사람이 이깁니다.
      </Notice>

      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault()
          if (trimmed.length > 0) {
            onSubmit(trimmed)
          }
        }}
      >
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="이름"
          maxLength={20}
          autoFocus
          className="rounded-lg border border-line bg-surface-sunken px-3 py-2.5 text-base outline-none focus:border-accent"
        />
        <Button type="submit" disabled={trimmed.length === 0}>
          {renaming ? '바꾸기' : '다음'}
        </Button>
        {onCancel ? (
          <Button variant="secondary" onClick={onCancel}>
            취소
          </Button>
        ) : null}
      </form>
    </Layout>
  )
}

function SaveFailedNotice() {
  return (
    <Notice tone="error">
      이 브라우저가 저장을 막고 있습니다. 창을 닫으면 판이 사라집니다. 사생활 보호(시크릿) 모드라면 일반 창에서
      열어 주세요.
    </Notice>
  )
}

function EditView({
  board,
  mine,
  revising,
  saveFailed,
  onChange,
  onDone,
}: {
  board: Board
  mine: MyBoard
  /** 진행하다가 고치러 들어왔는지 */
  revising: boolean
  saveFailed: boolean
  onChange: (next: MyBoard) => void
  onDone: () => void
}) {
  const missing = mine.cells.filter((cell) => cell.trim().length === 0).length

  return (
    <Layout title={board.title} subtitle={`${mine.name} 님의 판 ${revising ? '고치기' : '채우기'}`}>
      <Notice>
        {revising
          ? '문항을 고쳐도 체크한 칸은 그대로 남습니다.'
          : '내 판에 들어갈 문항을 채웁니다. 남의 문항과 달라도 됩니다.'}{' '}
        적는 대로 이 기기에 저장되고, 나중에 언제든 다시 고칠 수 있습니다.
      </Notice>

      <BoardEditor size={board.size} values={mine.cells} onChange={(cells) => onChange({ ...mine, cells })} />

      {saveFailed ? <SaveFailedNotice /> : null}

      <Button onClick={onDone} disabled={missing > 0}>
        {missing > 0 ? `${missing}칸 더 채우기` : revising ? '고치기 끝' : '이 판으로 시작하기'}
      </Button>
    </Layout>
  )
}

function PlayView({
  board,
  payload,
  mine,
  saveFailed,
  onChange,
  onEdit,
  onRename,
}: {
  board: Board
  payload: string
  mine: MyBoard
  saveFailed: boolean
  onChange: (next: MyBoard) => void
  onEdit: () => void
  onRename: () => void
}) {
  const [copied, setCopied] = useState(false)
  const checked = useMemo(() => new Set(mine.checked), [mine.checked])
  const { cellsInBingo, lineCount } = useMemo(() => evaluateBingo(board.size, checked), [board.size, checked])
  const won = hasWon(board, lineCount)

  function toggle(index: number) {
    const next = new Set(checked)
    if (next.has(index)) {
      next.delete(index)
    } else {
      next.add(index)
    }
    onChange({ ...mine, checked: [...next].sort((a, b) => a - b) })
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrlOf(payload))
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <Layout
      title={board.title}
      subtitle={`${mine.name} 님의 판`}
      footer={
        <div className="flex flex-col gap-2">
          <Button variant="secondary" onClick={onEdit}>
            문항 고치기
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => onChange({ ...mine, checked: [] })}>
              체크 모두 풀기
            </Button>
            <Button variant="secondary" onClick={onRename}>
              이름 바꾸기
            </Button>
          </div>
          <Button variant="secondary" onClick={copyLink}>
            {copied ? '복사했습니다' : '초대 링크 복사'}
          </Button>
          <button
            type="button"
            onClick={() => goTo('')}
            className="py-1 text-center text-xs text-ink-muted underline underline-offset-2"
          >
            처음 화면으로
          </button>
        </div>
      }
    >
      {won ? (
        <div className="rounded-lg border border-amber-400 bg-amber-400/15 px-3 py-3 text-center">
          <p className="text-base font-bold text-amber-700 dark:text-amber-300">
            빙고 {lineCount}줄 — 승리 조건 달성!
          </p>
          <p className="mt-0.5 text-xs text-ink-muted break-keep">
            목표는 {board.targetLines}줄이었습니다. 먼저 달성했는지는 같이 하는 사람과 확인하세요.
          </p>
        </div>
      ) : null}

      <div className="flex items-baseline justify-between text-sm">
        <span className="text-ink-muted">
          {checked.size} / {cellCountOf(board.size)} 칸
        </span>
        <span className={lineCount > 0 ? 'font-semibold text-amber-600 dark:text-amber-400' : 'text-ink-muted'}>
          빙고 {lineCount} / {board.targetLines}줄
        </span>
      </div>

      <BingoGrid
        size={board.size}
        cells={mine.cells}
        checked={checked}
        cellsInBingo={cellsInBingo}
        onToggle={toggle}
      />

      {saveFailed ? (
        <SaveFailedNotice />
      ) : (
        <Notice>이 기기에 자동으로 저장됩니다. 한 번 열어 둔 뒤에는 인터넷이 없어도 열립니다.</Notice>
      )}
    </Layout>
  )
}
