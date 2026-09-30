import type { Board, BoardSize } from '../types'

/** 판 한 장에 들어가는 칸 수 */
export function cellCountOf(size: BoardSize): number {
  return size * size
}

/** 아무것도 안 채운 판 */
export function emptyCells(size: BoardSize): string[] {
  return Array.from({ length: cellCountOf(size) }, () => '')
}

/** 모든 칸에 문항이 들어갔는지. 공백만 있는 칸은 빈 칸으로 본다 */
export function isFilled(cells: readonly string[]): boolean {
  return cells.every((cell) => cell.trim().length > 0)
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
