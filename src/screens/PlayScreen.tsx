import { useMemo, useState } from 'react'
import BingoGrid from '../components/BingoGrid'
import Layout, { Button, Notice } from '../components/Layout'
import { canUseFreeCenter, cellCountOf, evaluateBingo, resolveBoard } from '../lib/board'
import { boardIdOf, decodeBoard } from '../lib/encode'
import { goTo, shareUrlOf } from '../lib/route'
import { loadParticipantName, loadProgress, saveParticipantName, saveProgress } from '../lib/storage'
import type { Board } from '../types'

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
        <Button onClick={() => goTo('')}>내 판 만들기</Button>
      </Layout>
    )
  }

  return <PlayBoard board={decoded.board} payload={payload} />
}

function PlayBoard({ board, payload }: { board: Board; payload: string }) {
  const boardId = useMemo(() => boardIdOf(board), [board])
  const [participant, setParticipant] = useState<string | null>(() => loadParticipantName(boardId))

  if (!participant) {
    return (
      <JoinForm
        board={board}
        onJoin={(name) => {
          saveParticipantName(boardId, name)
          setParticipant(name)
        }}
      />
    )
  }

  return (
    <Playing
      // 판이나 참가자가 바뀌면 진행 상황을 처음부터 다시 읽어야 한다.
      // key를 주면 React가 알아서 새로 만들어 주므로 effect로 따라잡을 필요가 없다.
      key={`${boardId}:${participant}`}
      board={board}
      boardId={boardId}
      participant={participant}
      payload={payload}
      onLeave={() => setParticipant(null)}
    />
  )
}

function JoinForm({ board, onJoin }: { board: Board; onJoin: (name: string) => void }) {
  const [name, setName] = useState('')
  const trimmed = name.trim()

  return (
    <Layout title={board.title} subtitle="이름을 적으면 내 판이 만들어집니다.">
      <Notice>
        {board.shuffle
          ? '칸 배치는 이름에 따라 정해집니다. 사람마다 다른 판을 받게 됩니다.'
          : '참가자 모두 같은 배치의 판을 받습니다.'}
      </Notice>

      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault()
          if (trimmed.length > 0) {
            onJoin(trimmed)
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
          시작하기
        </Button>
      </form>
    </Layout>
  )
}

function Playing({
  board,
  boardId,
  participant,
  payload,
  onLeave,
}: {
  board: Board
  boardId: string
  participant: string
  payload: string
  onLeave: () => void
}) {
  const resolved = useMemo(() => resolveBoard(board, participant), [board, participant])
  const [checked, setChecked] = useState<Set<number>>(() => loadProgress(boardId, participant))
  const [copied, setCopied] = useState(false)

  const useFree = board.freeCenter && canUseFreeCenter(board.size)
  const freeIndex = Math.floor(cellCountOf(board.size) / 2)

  // 공짜 칸은 저장하지 않고 판정할 때만 채워 넣는다.
  // 저장된 진행 상황에 판 설정이 섞여 들어가지 않게 하기 위해서다.
  const effectiveChecked = useMemo(() => {
    if (!useFree) {
      return checked
    }
    const next = new Set(checked)
    next.add(freeIndex)
    return next
  }, [checked, useFree, freeIndex])

  const { cellsInBingo, lineCount } = useMemo(
    () => evaluateBingo(board.size, effectiveChecked),
    [board.size, effectiveChecked],
  )

  function toggle(index: number) {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      saveProgress(boardId, participant, next)
      return next
    })
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

  function reset() {
    const empty = new Set<number>()
    saveProgress(boardId, participant, empty)
    setChecked(empty)
  }

  const total = cellCountOf(board.size)
  const filled = effectiveChecked.size

  return (
    <Layout
      title={board.title}
      subtitle={`${participant} 님의 판`}
      footer={
        <div className="flex flex-col gap-2">
          <Button variant="secondary" onClick={copyLink}>
            {copied ? '복사했습니다' : '이 판 링크 복사'}
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={reset}>
              처음부터
            </Button>
            <Button variant="secondary" onClick={onLeave}>
              이름 바꾸기
            </Button>
          </div>
          <button
            type="button"
            onClick={() => goTo('')}
            className="py-1 text-center text-xs text-ink-muted underline underline-offset-2"
          >
            새 판 만들기
          </button>
        </div>
      }
    >
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-ink-muted">
          {filled} / {total} 칸
        </span>
        <span className={lineCount > 0 ? 'font-semibold text-amber-600 dark:text-amber-400' : 'text-ink-muted'}>
          {lineCount > 0 ? `빙고 ${lineCount}줄` : '빙고 없음'}
        </span>
      </div>

      <BingoGrid
        size={board.size}
        layout={resolved.layout}
        checked={effectiveChecked}
        cellsInBingo={cellsInBingo}
        onToggle={toggle}
      />

      <Notice>진행 상황은 이 브라우저에만 저장됩니다. 아직 다른 사람의 현황은 보이지 않습니다.</Notice>
    </Layout>
  )
}
