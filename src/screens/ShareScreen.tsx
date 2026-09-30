import { useState } from 'react'
import Layout, { Button, Notice } from '../components/Layout'
import { decodeBoard } from '../lib/encode'
import { goTo, shareUrlOf } from '../lib/route'
import type { Board } from '../types'

type Props = { payload: string }

export default function ShareScreen({ payload }: Props) {
  const [copied, setCopied] = useState(false)

  let board: Board
  try {
    board = decodeBoard(payload)
  } catch {
    return (
      <Layout title="링크를 읽지 못했습니다">
        <Notice tone="error">판 정보가 손상되었습니다.</Notice>
        <Button onClick={() => goTo('')}>처음으로</Button>
      </Layout>
    )
  }

  const url = shareUrlOf(payload)

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // 클립보드가 막힌 환경(주소가 https가 아니거나 권한 거부)에서는
      // 아래 주소 상자를 직접 길게 눌러 복사하면 된다.
      setCopied(false)
    }
  }

  return (
    <Layout title="초대 링크가 준비됐습니다" subtitle={board.title}>
      <Notice>
        링크를 받은 사람은 이름을 적고 자기 문항을 채워 자기 판을 만듭니다. 판은 각자의 기기에 저장되고, 한 번 연
        뒤에는 인터넷이 없어도 열립니다.
      </Notice>

      <Notice tone="warn">
        {board.size}×{board.size} 판 · {board.targetLines}줄을 먼저 만든 사람이 승리
      </Notice>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">초대 링크</span>
        <textarea
          readOnly
          value={url}
          rows={3}
          onFocus={(event) => event.currentTarget.select()}
          className="resize-none rounded-lg border border-line bg-surface-sunken px-3 py-2.5 font-mono text-xs break-all outline-none"
        />
      </div>

      <Button onClick={copy}>{copied ? '복사했습니다' : '링크 복사'}</Button>
      <Button variant="secondary" onClick={() => goTo(`b=${payload}`)}>
        내 판 채우기
      </Button>
      <Button variant="secondary" onClick={() => goTo('')}>
        처음 화면으로
      </Button>
    </Layout>
  )
}
