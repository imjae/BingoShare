import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // 상대 경로로 둬서 어느 정적 호스팅에 올리든(루트든 하위 경로든) 그대로 동작한다.
  // 공유 링크는 해시(#)를 쓰므로 히스토리 라우팅이 필요 없어 이 방식이 안전하다.
  base: './',
  plugins: [react(), tailwindcss()],
})
