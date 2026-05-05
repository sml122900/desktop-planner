/**
 * widgets/GoalWidget.jsx — 목표 & 진행률 위젯
 *
 * 표시 내용:
 * - 목표별 프로그레스바 (진행률 %)
 * - 미니 캘린더 (이번 달 달력)
 * - 목표 달성 시 완료 표시
 */

import React, { useState } from 'react'
import { useGoals } from '../hooks/useGoals'

const COLOR_MAP = {
  purple: '#8E82FF',
  teal:   '#1D9E75',
  amber:  '#EF9F27',
  pink:   '#D4537E',
  blue:   '#378ADD',
}

export default function GoalWidget() {
  const { goals, loading, addGoal, updateGoalProgress, removeGoal } = useGoals()
  const [editingId, setEditingId] = useState(null)  // 현재 진행률 편집 중인 목표 ID
  const [showAddForm, setShowAddForm] = useState(false)

  if (loading) {
    return <div className="widget goal-widget loading">목표 불러오는 중...</div>
  }

  return (
    <div className="widget goal-widget">
      <div className="widget-header">
        <span className="widget-title">이번 달 목표</span>
        <button className="icon-btn" onClick={() => setShowAddForm((v) => !v)}>
          {showAddForm ? '✕' : '+'}
        </button>
      </div>

      {showAddForm && (
        <AddGoalForm
          onAdd={async (data) => {
            await addGoal(data)
            setShowAddForm(false)
          }}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {/* 목표 목록 */}
      <div className="goals-list">
        {goals.map((goal) => {
          // 진행률 퍼센트 계산 (0~100 사이로 클램핑)
          const pct = Math.min(100, Math.round((goal.current / goal.target) * 100))
          const isComplete = pct >= 100  // 100% 달성 여부
          const barColor = COLOR_MAP[goal.color] ?? COLOR_MAP.purple

          return (
            <div key={goal.id} className="goal-item">
              <div className="goal-header">
                <span className={`goal-label ${isComplete ? 'complete' : ''}`}>
                  {/* 달성 완료 시 체크 이모지 표시 */}
                  {isComplete ? '✓ ' : ''}
                  {goal.title}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {/* 진행률 클릭 시 편집 모드 */}
                  {editingId === goal.id ? (
                    <input
                      type="number"
                      className="progress-input"
                      defaultValue={goal.current}
                      min={0}
                      max={goal.target}
                      autoFocus
                      // Enter 또는 포커스 이탈 시 저장
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          updateGoalProgress(goal.id, Number(e.target.value))
                          setEditingId(null)
                        }
                        if (e.key === 'Escape') setEditingId(null)
                      }}
                      onBlur={(e) => {
                        updateGoalProgress(goal.id, Number(e.target.value))
                        setEditingId(null)
                      }}
                    />
                  ) : (
                    <span
                      className="goal-pct"
                      onClick={() => setEditingId(goal.id)}
                      title="클릭하여 진행률 수정"
                      style={{ cursor: 'pointer' }}
                    >
                      {/* 단위에 따라 표시 형식 다르게 */}
                      {goal.unit === '%'
                        ? `${pct}%`
                        : `${goal.current}/${goal.target}${goal.unit}`
                      }
                    </span>
                  )}
                  <button
                    className="remove-btn small"
                    onClick={() => {
                      if (confirm(`"${goal.title}" 목표를 삭제할까요?`)) {
                        removeGoal(goal.id)
                      }
                    }}
                  >✕</button>
                </div>
              </div>

              {/* 프로그레스 바 */}
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{
                    width: `${pct}%`,
                    background: barColor,
                    // 100% 달성 시 살짝 밝은 색으로
                    filter: isComplete ? 'brightness(1.2)' : 'none',
                  }}
                />
              </div>
            </div>
          )
        })}

        {goals.length === 0 && (
          <div className="empty-state">목표를 추가해 보세요</div>
        )}
      </div>

      {/* 미니 캘린더 */}
      <MiniCalendar />
    </div>
  )
}

// ─────────────────────────────────────────────
// 미니 캘린더 컴포넌트
// 이번 달 달력을 작게 표시합니다.
// ─────────────────────────────────────────────
function MiniCalendar() {
  const today = new Date()
  const todayDate = today.getDate()   // 오늘 날짜 (1~31)
  const year  = today.getFullYear()
  const month = today.getMonth()      // 0~11 (0=1월)

  // 이번 달 1일의 요일 (0=일, 1=월 ...)
  const firstDayOfWeek = new Date(year, month, 1).getDay()
  // 이번 달 마지막 날짜
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  // 요일 헤더
  const dayLabels = ['월', '화', '수', '목', '금', '토', '일']

  // 1일 전까지 빈 칸 채우기
  // firstDayOfWeek는 일요일=0이므로, 월요일 기준으로 변환
  const offset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1
  const emptyCells = Array(offset).fill(null)

  // 날짜 배열 생성 (1 ~ daysInMonth)
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  return (
    <div className="mini-calendar">
      {/* 요일 헤더 */}
      {dayLabels.map((d) => (
        <div key={d} className="day-cell day-label">{d}</div>
      ))}
      {/* 빈 칸 */}
      {emptyCells.map((_, i) => (
        <div key={`empty-${i}`} className="day-cell" />
      ))}
      {/* 날짜 */}
      {days.map((d) => (
        <div
          key={d}
          className={[
            'day-cell',
            d === todayDate ? 'today' : '',
          ].filter(Boolean).join(' ')}
        >
          {d}
        </div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────
// 목표 추가 폼
// ─────────────────────────────────────────────
function AddGoalForm({ onAdd, onCancel }) {
  const [form, setForm] = useState({
    title: '',
    target: 100,
    current: 0,
    unit: '%',
    period: 'month',
    color: 'purple',
  })

  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.title) { alert('목표 제목을 입력하세요.'); return }
    onAdd({ ...form, target: Number(form.target), current: Number(form.current) })
  }

  return (
    <form className="add-event-form" onSubmit={handleSubmit}>
      <input name="title" type="text" placeholder="목표 제목 *" value={form.title} onChange={handleChange} required />
      <div className="form-row">
        <input name="target" type="number" placeholder="목표값" value={form.target} onChange={handleChange} min={1} />
        <input name="unit"   type="text"   placeholder="단위 (%, 편, 권...)" value={form.unit} onChange={handleChange} />
      </div>
      <div className="form-row">
        <select name="period" value={form.period} onChange={handleChange}>
          <option value="day">오늘</option>
          <option value="week">이번 주</option>
          <option value="month">이번 달</option>
        </select>
        <select name="color" value={form.color} onChange={handleChange}>
          <option value="purple">보라</option>
          <option value="teal">청록</option>
          <option value="amber">황금</option>
          <option value="pink">핑크</option>
        </select>
      </div>
      <div className="form-actions">
        <button type="submit" className="btn-primary">추가</button>
        <button type="button" className="btn-ghost" onClick={onCancel}>취소</button>
      </div>
    </form>
  )
}
