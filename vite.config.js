import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite 설정 파일
// 개발 서버를 localhost:5173에서 실행하고,
// Electron의 Renderer 프로세스가 이 주소를 불러옵니다.
export default defineConfig({
  plugins: [react()],
  base: './',           // 빌드된 파일을 상대 경로로 참조 (Electron 배포용)
  server: {
    port: 5173,
  },
  build: {
    outDir: 'dist',     // 빌드 결과물이 저장될 폴더
  },
})
