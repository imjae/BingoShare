import { useState } from 'react'
import Layout, { Button, Notice } from '../components/Layout'
import { evaluateBingo } from '../lib/board'
import { decodeBoard, encodeBoard, newNonce } from '../lib/encode'
import { goTo } from '../lib/route'
import { listMyBoards, type SavedEntry } from '../lib/storage'
import { targetLineOptions, type BoardSize } from '../types'

const SIZES: BoardSize[] = [3, 4, 5]

export default function CreateScreen() {
  const [title, setTitle] = useState('')
  const [size, setSize] = useState<BoardSize>(5)
  const [targetLines, setTargetLines] = useState(1)
  // 처음 화면을 열 때 한 번만 읽는다. 이 화면에 있는 동안 저장된 판이 바뀔 일은 없다.
  const [saved] = useState(() => listMyBoards())

  const lineChoices = targetLineOptions(size)
  const effectiveTarget = Math.min(targetLines, lineChoices[lineChoices.length - 1])

  function handleCreate() {
    const payload = encodeBoard({
      title: title.trim() || '빙고',
      size,
      targetLines: effectiveTarget,
      nonce: newNonce(),
    })
    goTo(`s=${payload}`)
  }

  return (
    <Layout title="BingoShare" subtitle="빙고판 설정을 링크로 보내면, 받은 사람이 각자 자기 판을 채웁니다.">
      {saved.length > 0 ? (
        <section className="flex flex-col gap-2">
          <span className="text-sm font-medium">이 기기에 저장된 판</span>
          <div className="flex flex-col gap-1.5">
            {saved.map((entry) => (
              <SavedRow key={entry.boardId} entry={entry} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="flex flex-col gap-5">
        {saved.length > 0 ? <span className="text-sm font-medium">새 초대 링크 만들기</span> : null}

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

        <Notice>
          링크를 받은 사람이 이름을 적고 빈 판에서 자기 문항 {size * size}개를 채웁니다. 나도 링크를 열어 내 판을
          채우면 됩니다.
        </Notice>

        <Button onClick={handleCreate}>초대 링크 만들기</Button>
      </section>
    </Layout>
  )
}

function SavedRow({ entry }: { entry: SavedEntry }) {
  let board
  try {
    board = decodeBoard(entry.payload)
  } catch {
    // 저장해 둔 링크 조각이 망가졌다면 열 수도 없으니 목록에서 뺀다.
    return null
  }
  const { lineCount } = evaluateBingo(board.size, new Set(entry.checked))

  return (
    <button
      type="button"
      onClick={() => goTo(`b=${entry.payload}`)}
      className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface-sunken px-3 py-2.5 text-left"
    >
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-semibold">{board.title}</span>
        <span className="truncate text-xs text-ink-muted">
          {entry.name ? `${entry.name} 님 · ` : ''}
          {board.size}×{board.size}
        </span>
      </span>
      <span className={['shrink-0 text-xs', lineCount > 0 ? 'font-semibold text-amber-600 dark:text-amber-400' : 'text-ink-muted'].join(' ')}>
        빙고 {lineCount} / {board.targetLines}줄
      </span>
    </button>
  )
}
