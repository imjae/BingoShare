import { useState } from 'react'

const PLACEHOLDER_CELLS = [
  '늦게 온 사람',
  '커피 쏟기',
  '같은 옷 두 명',
  '전화 받으러 나감',
  '노트북 배터리 방전',
  '회의 5분 초과',
  '오타 난 슬라이드',
  '핸드폰 진동',
  'FREE',
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
]

export default function App() {
  const [checked, setChecked] = useState<Set<number>>(new Set([8]))

  function toggle(index: number) {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  return (
    <div className="min-h-dvh bg-surface text-ink">
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-5 px-4 py-6">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">BingoShare</h1>
          <p className="text-sm text-ink-muted">
            커스텀 빙고판을 만들어 링크 하나로 공유하세요.
          </p>
        </header>

        <div className="rounded-lg border border-line bg-surface-sunken px-3 py-2 text-xs text-ink-muted">
          M0 뼈대 — 아래 판은 겉모습 확인용 예시입니다. 칸을 눌러보면 반응합니다.
        </div>

        <main className="grid grid-cols-5 gap-1.5">
          {PLACEHOLDER_CELLS.map((cell, index) => {
            const isChecked = checked.has(index)
            return (
              <button
                key={index}
                type="button"
                onClick={() => toggle(index)}
                aria-pressed={isChecked}
                className={[
                  'flex aspect-square items-center justify-center rounded-md border p-1',
                  'text-[10px] leading-tight font-medium break-keep',
                  'transition-colors',
                  isChecked
                    ? 'border-accent bg-accent text-white'
                    : 'border-line bg-surface-sunken text-ink',
                ].join(' ')}
              >
                {cell}
              </button>
            )
          })}
        </main>

        <footer className="mt-auto text-center text-xs text-ink-muted">
          {checked.size} / {PLACEHOLDER_CELLS.length} 칸
        </footer>
      </div>
    </div>
  )
}
