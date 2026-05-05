/**
 * renderer/src/App.jsx — 루트 컴포넌트
 *
 * 역할:
 * 1. 마우스 hover/leave 감지 → Main에 알려 클릭 통과 제어
 * 2. 테마/레이아웃 설정을 Context로 하위 컴포넌트에 전달
 * 3. 위젯 레이아웃 선택 및 렌더링
 */

import React, { useEffect, useState, useCallback } from 'react'
import ScheduleWidget from './widgets/ScheduleWidget'
import GoalWidget from './widgets/GoalWidget'
import FocusWidget from './widgets/FocusWidget'
import { useConfig } from './hooks/useConfig'

export default function App() {
  // 설정 데이터 (테마, 레이아웃 등)
  const { config, loading } = useConfig()

  // ── 마우스 클릭 통과 제어 ──
  // 마우스가 위젯 영역 안에 있는지 추적
  const handleMouseEnter = useCallback(() => {
    // preload.js를 통해 Main에 "마우스가 들어왔어!" 신호 전송
    // Main은 setIgnoreMouseEvents(false)로 클릭 통과를 해제합니다.
    window.electron.mouse.hover()
  }, [])

  const handleMouseLeave = useCallback(() => {
    // "마우스가 나갔어!" 신호 → Main이 클릭 통과 다시 활성화
    window.electron.mouse.leave()
  }, [])

  // 설정 로딩 중에는 아무것도 렌더링하지 않음
  if (loading) return null

  // 테마에 따른 CSS 클래스 이름
  const themeClass = `theme-${config.theme ?? 'dark-night'}`

  return (
    // onMouseEnter/onMouseLeave: 마우스가 이 div 영역에 들어오고 나갈 때 실행
    <div
      className={`app-container ${themeClass}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* 레이아웃에 따라 다른 구조로 위젯 배치 */}
      {config.layout === 'horizontal-split' && (
        <HorizontalSplitLayout />
      )}
      {config.layout === 'top-bar-3col' && (
        <TopBar3ColLayout />
      )}
      {config.layout === 'sidebar' && (
        <SidebarLayout />
      )}
    </div>
  )
}

// ── 레이아웃 1: 수평 분할 (기본) ──
// [일정] [목표 + 포커스]
function HorizontalSplitLayout() {
  return (
    <div className="layout-horizontal">
      <div className="layout-main">
        <ScheduleWidget />
      </div>
      <div className="layout-side">
        <GoalWidget />
        <FocusWidget />
      </div>
    </div>
  )
}

// ── 레이아웃 2: 상단바 + 3열 ──
// [포커스바]
// [일정] [목표] [체크리스트]
function TopBar3ColLayout() {
  return (
    <div className="layout-top-3col">
      <div className="layout-topbar">
        <FocusWidget compact />
      </div>
      <div className="layout-columns">
        <ScheduleWidget />
        <GoalWidget />
        <FocusWidget checklistOnly />
      </div>
    </div>
  )
}

// ── 레이아웃 3: 사이드바 ──
// [아이콘 세로 독] [메인 패널]
function SidebarLayout() {
  const [activeWidget, setActiveWidget] = useState('schedule')

  return (
    <div className="layout-sidebar">
      {/* 좌측 아이콘 독 */}
      <div className="sidebar-dock">
        <button
          className={activeWidget === 'schedule' ? 'dock-btn active' : 'dock-btn'}
          onClick={() => setActiveWidget('schedule')}
          title="일정"
        >📅</button>
        <button
          className={activeWidget === 'goals' ? 'dock-btn active' : 'dock-btn'}
          onClick={() => setActiveWidget('goals')}
          title="목표"
        >🎯</button>
        <button
          className={activeWidget === 'focus' ? 'dock-btn active' : 'dock-btn'}
          onClick={() => setActiveWidget('focus')}
          title="포커스"
        >✅</button>
      </div>
      {/* 우측 메인 패널 */}
      <div className="sidebar-main">
        {activeWidget === 'schedule' && <ScheduleWidget />}
        {activeWidget === 'goals'    && <GoalWidget />}
        {activeWidget === 'focus'    && <FocusWidget />}
      </div>
    </div>
  )
}
