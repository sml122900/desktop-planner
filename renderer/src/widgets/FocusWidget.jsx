/**
 * widgets/FocusWidget.jsx — 포커스 & 체크리스트 위젯
 *
 * 표시 내용:
 * - "지금 집중할 것": 현재 시간 슬롯의 일정명
 * - 오늘의 명언 (랜덤 또는 사용자 지정)
 * - 오늘의 할 일 체크리스트 (클릭으로 완료 처리)
 */

import React, { useState } from 'react'
import { useGoals } from '../hooks/useGoals'
import { useSchedule } from '../hooks/useSchedule'

// 매일 랜덤으로 표시할 명언 목음
const QUOTES = [
  '계획 없는 목표는 단지 소망일 뿐이다.',
  '작은 진전이 매일 쌓이면 큰 결과가 된다.',
  '지금 하지 않으면 언제 하겠는가.',
  '완벽함보다 꾸준함이 더 중요하다.',
  '오늘의 나는 어제의 나보다 조금 더 나아졌다.',
  '집중은 수천 가지를 거절하는 것이다.',
  '성공은 매일의 작은 노력의 합산이다.',
]

// 오늘 날짜를 시드로 삼아 매일 같은 명언을 표시
// (같은 날 앱을 켜고 끌 때마다 바뀌지 않도록)
function getDailyQuote() {
  const dayOfYear = Math.floor(
    (new Date() - new Date(new Date().getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24)
  )
  return QUOTES[dayOfYear % QUOTES.length]
}

export default function FocusWidget({ compact = false, checklistOnly = false }) {
  const { events, currentEventId } = useSchedule()
  const {
    checklist,
    toggleChecklist,
    addChecklistItem,
    removeChecklistItem,
  } = useGoals()

  // 새 체크리스트 항목 입력 상태
  const [newItemText, setNewItemText] = useState('')

  // 현재 진행 중인 이벤트 찾기
  const currentEvent = events.find((e) => e.id === currentEventId)

  // 체크리스트 완료율 계산
  const doneCount  = checklist.filter((item) => item.done).length
  const totalCount = checklist.length

  // 체크리스트 항목 추가 핸들러
  async function handleAddItem(e) {
    e.preventDefault()
    const trimmed = newItemText.trim()
    if (!trimmed) return
    await addChecklistItem(trimmed)
    setNewItemText('')  // 입력 필드 초기화
  }

  // compact 모드: 포커스 바만 표시 (TopBar 레이아웃용)
  if (compact) {
    return (
      <div className="widget focus-widget compact">
        <div className="focus-now">
          <span className="focus-label">지금</span>
          <span className="focus-task">
            {currentEvent ? currentEvent.title : '자유 시간'}
          </span>
        </div>
        {totalCount > 0 && (
          <span className="checklist-progress">
            {doneCount}/{totalCount} 완료
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="widget focus-widget">
      {/* 헤더 */}
      {!checklistOnly && (
        <>
          <div className="widget-header">
            <span className="widget-title">지금 집중할 것</span>
          </div>

          {/* 현재 포커스 블록 */}
          <div className="focus-now">
            <div className="focus-label">현재 블록</div>
            <div className="focus-task">
              {currentEvent ? currentEvent.title : '자유 시간 ☕'}
            </div>
            {currentEvent?.subtitle && (
              <div className="focus-sub">{currentEvent.subtitle}</div>
            )}
          </div>

          {/* 오늘의 명언 */}
          <div className="quote-box">
            <p className="quote-text">"{getDailyQuote()}"</p>
          </div>
        </>
      )}

      {/* 오늘의 체크리스트 */}
      <div className="checklist-section">
        <div className="checklist-header">
          <span className="checklist-title">
            오늘의 할 일
            {/* 완료 항목이 있으면 진행률 표시 */}
            {totalCount > 0 && (
              <span className="checklist-count"> ({doneCount}/{totalCount})</span>
            )}
          </span>
        </div>

        <div className="checklist-items">
          {checklist.map((item) => (
            <ChecklistItem
              key={item.id}
              item={item}
              onToggle={() => toggleChecklist(item.id)}
              onRemove={() => removeChecklistItem(item.id)}
            />
          ))}

          {checklist.length === 0 && (
            <div className="empty-state small">할 일을 추가해 보세요</div>
          )}
        </div>

        {/* 새 항목 추가 입력 */}
        <form className="add-checklist-form" onSubmit={handleAddItem}>
          <input
            type="text"
            placeholder="+ 할 일 추가"
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            className="checklist-input"
          />
        </form>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// 개별 체크리스트 항목 컴포넌트
// ─────────────────────────────────────────────
function ChecklistItem({ item, onToggle, onRemove }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      className="checklist-item"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* 체크박스 영역 */}
      <button
        className={`check-box ${item.done ? 'checked' : ''}`}
        onClick={onToggle}
        title={item.done ? '완료 취소' : '완료 처리'}
      >
        {item.done && (
          // 완료 시 체크 아이콘 (SVG로 깔끔하게)
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
            <path d="M1 4L3 6L7 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        )}
      </button>

      {/* 항목 텍스트 */}
      <span
        className={`checklist-text ${item.done ? 'done' : ''}`}
        onClick={onToggle}
        style={{ cursor: 'pointer', flex: 1 }}
      >
        {item.title}
      </span>

      {/* 호버 시 삭제 버튼 표시 */}
      {hovered && (
        <button className="remove-btn small" onClick={onRemove} title="삭제">
          ✕
        </button>
      )}
    </div>
  )
}
