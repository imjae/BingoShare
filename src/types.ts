export type BoardSize = 3 | 4 | 5

/**
 * 링크에 담기는 판 설정. **만든 뒤에는 바뀌지 않는다.**
 *
 * 문항은 여기에 없다 — 링크를 받은 사람이 각자 자기 판을 채운다.
 * 설정을 고치고 싶으면 새 링크를 만든다.
 */
export type Board = {
  title: string
  size: BoardSize
  /** 이만큼 줄을 **먼저** 만든 사람이 이긴다 */
  targetLines: number
  /**
   * 같은 설정으로 만든 링크끼리 구분하는 임의 값.
   * 이게 없으면 "빙고 · 5×5 · 1줄" 초대 두 개가 완전히 같은 링크가 되어
   * 서로 다른 모임의 판이 한 기기에서 하나로 합쳐진다.
   * 2026-09-30 이전 링크에는 없어서 빈 문자열이다.
   */
  nonce: string
}

/** 이 기기에 저장된 내 판. 링크 하나에 하나씩 둔다 */
export type MyBoard = {
  /** 표시용 이름. 바꿔도 판은 그대로다 */
  name: string
  /** size×size 개. 아직 안 채운 칸은 빈 문자열 */
  cells: string[]
  /** 체크한 칸 번호. 문항을 고쳐도 자리에 그대로 남는다 */
  checked: number[]
}

/**
 * 한 칸에 적을 수 있는 글자 수. 긴 문항이 잦아 30자에서 늘렸다(2026-09-30).
 * 칸보다 길면 글자를 줄여 맞추고, 그래도 넘치면 `…`로 자른 뒤 길게 눌러 전체를 본다.
 */
export const MAX_CELL_LENGTH = 60

/** 고를 수 있는 승리 줄 수 — 판이 작을수록 만들 수 있는 줄도 적다 */
export function targetLineOptions(size: BoardSize): number[] {
  const maxLines = size * 2 + 2
  return [1, 2, 3, 4, 5].filter((value) => value <= maxLines)
}
