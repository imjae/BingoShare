import { useState } from 'react'
import Layout, { Button, Notice } from '../components/Layout'
import { decodeBoard } from '../lib/encode'
import { goTo, shareUrlOf } from '../lib/route'
import { MAX_URL_LENGTH } from '../types'

type Props = { payload: string }

export default function ShareScreen({ payload }: Props) {
  const [copied, setCopied] = useState(false)

  let title: string
  try {
    title = decodeBoard(payload).title
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
    <Layout title="판이 준비됐습니다" subtitle={title}>
      <Notice>
        아래 링크를 보내면 상대가 자기 판을 열게 됩니다. 판 내용이 링크 안에 통째로 들어 있어서
        서버에 저장되는 것은 없습니다.
      </Notice>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">공유 링크</span>
        <textarea
          readOnly
          value={url}
          rows={3}
          onFocus={(event) => event.currentTarget.select()}
          className="resize-none rounded-lg border border-line bg-surface-sunken px-3 py-2.5 font-mono text-xs break-all outline-none"
        />
        <span className="text-xs text-ink-muted">
          {url.length}자 / 최대 {MAX_URL_LENGTH}자
        </span>
      </div>

      <Button onClick={copy}>{copied ? '복사했습니다' : '링크 복사'}</Button>
      <Button variant="secondary" onClick={() => goTo(`b=${payload}`)}>
        내 판 열기
      </Button>
      <Button variant="secondary" onClick={() => goTo('')}>
        새 판 만들기
      </Button>
    </Layout>
  )
}
