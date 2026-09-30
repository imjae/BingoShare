import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, relative, resolve, sep } from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

/** 폴더 아래 파일 전부를 슬래시 경로로. 윈도우에서 빌드해도 주소로 쓸 수 있어야 한다 */
function listFiles(dir: string): string[] {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => relative(dir, join(entry.parentPath, entry.name)).split(sep).join('/'))
    .sort()
}

/**
 * 빌드가 끝나면 dist를 훑어 서비스 워커(sw.js)를 만든다. 본체는 `sw/service-worker.js`.
 *
 * 캐시할 파일 목록을 손으로 적지 않는 게 핵심이다. 파일 이름에 해시가 붙어 빌드마다 바뀌고,
 * 하나라도 빠지면 오프라인에서 그 파일만 못 받아 화면이 깨진다.
 */
function offlineCache(): Plugin {
  let root = ''
  let outDir = ''
  return {
    name: 'bingoshare-offline-cache',
    apply: 'build',
    configResolved(config) {
      root = config.root
      outDir = resolve(config.root, config.build.outDir)
    },
    closeBundle() {
      // 빌드가 도중에 실패하면 dist가 없을 수 있다. 원래 오류를 가리지 않게 조용히 빠진다.
      if (!existsSync(outDir)) {
        return
      }
      const files = listFiles(outDir).filter((file) => file !== 'sw.js')
      const body = readFileSync(resolve(root, 'sw/service-worker.js'), 'utf8')
      // 서비스 워커 본체도 넣는다. 캐시 방식만 고친 배포에서도 캐시를 새로 받게 하려는 것이다.
      const hash = createHash('sha256').update(body)
      for (const file of files) {
        hash.update(file)
        hash.update(readFileSync(join(outDir, file)))
      }
      const version = hash.digest('hex').slice(0, 12)
      const header = `const VERSION = ${JSON.stringify(version)}\nconst PRECACHE = ${JSON.stringify(files)}\n\n`
      writeFileSync(join(outDir, 'sw.js'), header + body)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  // 상대 경로로 둬서 어느 정적 호스팅에 올리든(루트든 하위 경로든) 그대로 동작한다.
  // 공유 링크는 해시(#)를 쓰므로 히스토리 라우팅이 필요 없어 이 방식이 안전하다.
  base: './',
  plugins: [react(), tailwindcss(), offlineCache()],
})
