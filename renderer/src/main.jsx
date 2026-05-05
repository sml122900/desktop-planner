/**
 * renderer/src/main.jsx — React 앱의 진입점
 *
 * React 앱은 이 파일에서 시작됩니다.
 * index.html의 <div id="root">에 React 컴포넌트를 마운트합니다.
 */

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/global.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/*
      StrictMode: 개발 중에만 동작하는 검사 모드
      - 잠재적인 문제를 콘솔에 경고해줍니다.
      - 배포 빌드에서는 자동으로 비활성화됩니다.
    */}
    <App />
  </React.StrictMode>
)
