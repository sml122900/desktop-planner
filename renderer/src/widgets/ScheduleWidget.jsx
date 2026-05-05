/**
 * widgets/ScheduleWidget.jsx — 오늘 일정 위젯
 *
 * 표시 내용:
 * - 시간대별 일정 슬롯 목록
 * - 현재 진행 중인 슬롯 하이라이트 (보라색 배경)
 * - 완료된 슬롯 흐리게 표시
 * - 알람이 울린 슬롯 깜빡임 애니메이션
 * - 슬롯 클릭 → 완료 토글
 * - 알람 아이콘 클릭 → 알람 on/off 토글
 */

import React, { useState } from 'react'
import { useSchedule } from '../hooks/useSchedule'

// 카테고리 색상 매핑: 카테고리 ID → CSS 색상값
const COLOR_MAP = {
  purple: '#8E82FF',
  teal:   '#1D9E75',
  amber:  '#EF9F27',
  gray:   'rgba(255,255,255,0.3)',
  pink:   '#D4537E',
}

export default function ScheduleWidget() {
  const {
    events,
    currentEventId,  // 현재 진행 중인 이벤트 ID
    flashEventId,    // 알람이 울린 이벤트 ID (강조용)
    loading,
    toggleDone,
    toggleAlarm,
    removeEvent,
    addEvent,
  } = useSchedule()

  // 새 일정 추가 폼 표시 여부
  const [showAddForm, setShowAddForm] = useState(false)

  if (loading) {
    return <div className="widget schedule-widget loading">일정 불러오는 중...</div>
  }

  return (
    <div className="widget schedule-widget">
      {/* 위젯 헤더 */}
      <div className="widget-header">
        <span className="widget-title">오늘 일정</span>
        {/* + 버튼 클릭 시 추가 폼 토글 */}
        <button
          className="icon-btn"
          onClick={() => setShowAddForm((v) => !v)}
          title="일정 추가"
        >
          {showAddForm ? '✕' : '+'}
        </button>
      </div>

      {/* 새 일정 추가 폼 */}
      {showAddForm && (
        <AddEventForm
          onAdd={async (data) => {
            await addEvent(data)
            setShowAddForm(false)
          }}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {/* 일정 슬롯 목록 */}
      <div className="slots-container">
        {events.length === 0 ? (
          <div className="empty-state">오늘 일정이 없습니다</div>
        ) : (
          events
            // startTime 기준 오름차순 정렬 (문자열 비교로도 "09:00" < "10:00" 올바르게 작동)
            .sort((a, b) => a.startTime.localeCompare(b.startTime))
            .map((evt) => (
              <TimeSlot
                key={evt.id}
                event={evt}
                isActive={evt.id === currentEventId}  // 현재 진행 중?
                isFlash={evt.id === flashEventId}     // 알람 강조 중?
                onToggleDone={() => toggleDone(evt.id)}
                onToggleAlarm={() => toggleAlarm(evt.id)}
                onRemove={() => removeEvent(evt.id)}
              />
            ))
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// 개별 시간 슬롯 컴포넌트
// ─────────────────────────────────────────────
function TimeSlot({ event, isActive, isFlash, onToggleDone, onToggleAlarm, onRemove }) {
  const [showControls, setShowControls] = useState(false)

  // CSS 클래스 조합
  // - active: 현재 진행 중인 슬롯 (보라색 하이라이트)
  // - done: 완료된 슬롯 (흐리게)
  // - flash: 알람이 울린 슬롯 (깜빡임 애니메이션)
  const slotClass = [
    'time-slot',
    isActive ? 'active' : '',
    event.done ? 'done' : '',
    isFlash ? 'flash' : '',
  ].filter(Boolean).join(' ')

  return (
    <div
      className={slotClass}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      {/* 카테고리 색상 점 */}
      <div
        className="slot-dot"
        style={{ background: COLOR_MAP[event.color] ?? COLOR_MAP.gray }}
      />

      {/* 시작 시간 */}
      <span className="slot-time">{event.startTime}</span>

      {/* 내용 영역 — 클릭하면 완료 토글 */}
      <div
        className="slot-content"
        onClick={onToggleDone}
        title={event.done ? '완료 취소' : '완료 처리'}
        style={{ cursor: 'pointer', flex: 1 }}
      >
        <div className={`slot-title ${event.done ? 'strikethrough' : ''}`}>
          {event.title}
        </div>
        {event.subtitle && (
          <div className="slot-sub">{event.subtitle}</div>
        )}
      </div>

      {/* 호버 시 나타나는 컨트롤 버튼들 */}
      {showControls && (
        <div className="slot-controls">
          {/* 알람 on/off 토글 */}
          <button
            className={`alarm-btn ${event.alarmEnabled ? 'on' : 'off'}`}
            onClick={(e) => {
              e.stopPropagation()  // 부모 click 이벤트(완료 토글) 전파 차단
              onToggleAlarm()
            }}
            title={event.alarmEnabled ? '알람 끄기' : '알람 켜기'}
          >
            {event.alarmEnabled ? '🔔' : '🔕'}
          </button>

          {/* 삭제 버튼 */}
          <button
            className="remove-btn"
            onClick={(e) => {
              e.stopPropagation()
              if (confirm(`"${event.title}" 일정을 삭제할까요?`)) {
                onRemove()
              }
            }}
            title="일정 삭제"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// 새 일정 추가 폼 컴포넌트
// ─────────────────────────────────────────────
function AddEventForm({ onAdd, onCancel }) {
  // 폼 상태: 각 입력 필드의 현재 값
  const [form, setForm] = useState({
    title: '',
    subtitle: '',
    startTime: '',
    endTime: '',
    category: 'work',
    color: 'purple',
    repeat: 'none',
    alarmEnabled: true,
  })

  // 입력 필드 변경 핸들러
  // e.target.name: 입력 필드의 name 속성 (예: "title", "startTime")
  // e.target.value: 입력된 값
  function handleChange(e) {
    const { name, value, type, checked } = e.target
    setForm((prev) => ({
      ...prev,
      // 체크박스는 checked 값을, 나머지는 value를 사용
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  function handleSubmit(e) {
    e.preventDefault()  // 폼 기본 제출 동작(페이지 새로고침) 막기
    if (!form.title || !form.startTime) {
      alert('제목과 시작 시간은 필수입니다.')
      return
    }
    onAdd({
      ...form,
      // repeat이 'none'이면 오늘 날짜를 date로 지정
      date: form.repeat === 'none'
        ? new Date().toISOString().slice(0, 10)
        : undefined,
    })
  }

  return (
    <form className="add-event-form" onSubmit={handleSubmit}>
      <input
        name="title"
        type="text"
        placeholder="일정 제목 *"
        value={form.title}
        onChange={handleChange}
        required
      />
      <input
        name="subtitle"
        type="text"
        placeholder="부제목 (선택)"
        value={form.subtitle}
        onChange={handleChange}
      />
      <div className="form-row">
        <input
          name="startTime"
          type="time"
          value={form.startTime}
          onChange={handleChange}
          required
          placeholder="시작 시간"
        />
        <input
          name="endTime"
          type="time"
          value={form.endTime}
          onChange={handleChange}
          placeholder="종료 시간"
        />
      </div>
      <div className="form-row">
        <select name="category" value={form.category} onChange={handleChange}>
          <option value="work">업무</option>
          <option value="trading">트레이딩</option>
          <option value="personal">개인</option>
          <option value="routine">루틴</option>
        </select>
        <select name="repeat" value={form.repeat} onChange={handleChange}>
          <option value="none">오늘만</option>
          <option value="daily">매일</option>
          <option value="weekdays">평일만</option>
        </select>
      </div>
      {/* 알람 체크박스 */}
      <label className="checkbox-label">
        <input
          name="alarmEnabled"
          type="checkbox"
          checked={form.alarmEnabled}
          onChange={handleChange}
        />
        시작 시간에 알람 받기
      </label>
      <div className="form-actions">
        <button type="submit" className="btn-primary">추가</button>
        <button type="button" className="btn-ghost" onClick={onCancel}>취소</button>
      </div>
    </form>
  )
}
