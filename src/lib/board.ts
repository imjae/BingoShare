import { boardIdOf, hashString } from './encode'
import { FREE_CELL, type Board, type BoardSize, type ResolvedBoard } from '../types'

/** 판 한 장에 들어가는 칸 수 */
export function cellCountOf(size: BoardSize): number {
  return size * size
}

/** 가운데 공짜 칸을 쓸 수 있는 크기인지 (가운데가 있으려면 홀수여야 한다) */
export function canUseFreeCenter(size: BoardSize): boolean {
  return size % 2 === 1
}

/** 사용자가 직접 채워야 하는 문항의 최소 개수 */
export function requiredCellCount(size: BoardSize, freeCenter: boolean): number {
  return cellCountOf(size) - (freeCenter && canUseFreeCenter(size) ? 1 : 0)
}

/**
 * 판의 각 자리가 **몇 번째 문항**을 쓰는지 알려주는 표.
 * 공짜 칸 자리는 `null`이다 — 문항을 먹지 않기 때문이다.
 *
 * 판 위에서 칸을 눌러 문항을 채우는 화면과, 실제 배치를 만드는 쪽이
 * 같은 표를 써야 번호가 어긋나지 않는다.
 */
export function cellSlotMap(size: BoardSize, freeCenter: boolean): (number | null)[] {
  const total = cellCountOf(size)
  const useFree = freeCenter && canUseFreeCenter(size)
  const centerIndex = Math.floor(total / 2)
  const map: (number | null)[] = []
  let slot = 0
  for (let i = 0; i < total; i += 1) {
    if (useFree && i === centerIndex) {
      map.push(null)
    } else {
      map.push(slot)
      slot += 1
    }
  }
  return map
}

/** mulberry32 — 시드 하나로 같은 순서를 재현하는 난수 발생기 */
function seededRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** 제자리를 바꾸지 않는 Fisher-Yates */
function shuffled<T>(items: T[], random: () => number): T[] {
  const result = items.slice()
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

/**
 * 참가자 한 명에게 보일 배치를 확정한다.
 *
 * 시드를 **판 id + 참가자 이름**에서 뽑기 때문에, 새로고침해도 같은 자리가 나온다.
 * 저장해 둔 진행 상황이 엉뚱한 칸에 붙는 사고를 막는 핵심이다.
 */
export function resolveBoard(board: Board, participant: string, ownCells: string[] = []): ResolvedBoard {
  const boardId = boardIdOf(board)
  const total = cellCountOf(board.size)
  const useFree = board.freeCenter && canUseFreeCenter(board.size)
  const need = requiredCellCount(board.size, board.freeCenter)

  // 각자 판 모드에서는 자기가 적은 문항을 적은 순서 그대로 쓴다.
  // 남과 배치를 맞출 이유가 없으니 섞지 않는다.
  const pool = board.mode === 'own' ? ownCells : board.cells
  const doShuffle = board.mode === 'shared' && board.shuffle

  let picked: string[]
  if (doShuffle) {
    const random = seededRandom(hashString(`${boardId}:${participant}`))
    picked = shuffled(pool, random).slice(0, need)
  } else {
    picked = pool.slice(0, need)
  }

  // 문항이 모자라면 빈 칸으로 채운다. 만들기 화면에서 막고 있지만,
  // 남이 만든 링크가 들어올 수도 있으므로 여기서도 무너지지 않게 둔다.
  while (picked.length < need) {
    picked.push('')
  }

  const layout: string[] = []
  const centerIndex = Math.floor(total / 2)
  let cursor = 0
  for (let i = 0; i < total; i += 1) {
    if (useFree && i === centerIndex) {
      layout.push(FREE_CELL)
    } else {
      layout.push(picked[cursor])
      cursor += 1
    }
  }

  return { board, boardId, participant, layout }
}

/** 가로 · 세로 · 대각선 한 줄씩의 칸 번호 목록 */
export function linesOf(size: BoardSize): number[][] {
  const lines: number[][] = []
  for (let row = 0; row < size; row += 1) {
    lines.push(Array.from({ length: size }, (_, col) => row * size + col))
  }
  for (let col = 0; col < size; col += 1) {
    lines.push(Array.from({ length: size }, (_, row) => row * size + col))
  }
  lines.push(Array.from({ length: size }, (_, i) => i * size + i))
  lines.push(Array.from({ length: size }, (_, i) => i * size + (size - 1 - i)))
  return lines
}

export type BingoResult = {
  /** 완성된 줄의 칸 번호를 모두 합친 것 — 강조 표시에 쓴다 */
  cellsInBingo: Set<number>
  lineCount: number
}

/** 승리 조건을 채웠는지 */
export function hasWon(board: Board, lineCount: number): boolean {
  return lineCount >= board.targetLines
}

export function evaluateBingo(size: BoardSize, checked: ReadonlySet<number>): BingoResult {
  const cellsInBingo = new Set<number>()
  let lineCount = 0
  for (const line of linesOf(size)) {
    if (line.every((index) => checked.has(index))) {
      lineCount += 1
      for (const index of line) {
        cellsInBingo.add(index)
      }
    }
  }
  return { cellsInBingo, lineCount }
}

/** 붙여넣은 여러 줄을 문항 목록으로. 빈 줄과 앞뒤 공백, 중복은 걸러낸다. */
export function parseCellInput(text: string): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (line.length === 0 || seen.has(line)) {
      continue
    }
    seen.add(line)
    result.push(line)
  }
  return result
}
