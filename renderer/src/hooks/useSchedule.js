/**
 * hooks/useSchedule.js — 일정 데이터 커스텀 훅
 *
 * 제공하는 것:
 * - events: 오늘 일정 배열
 * - currentEventId: 현재 시간에 해당하는 이벤트 ID
 * - flashEventId: 알람이 울린 이벤트 ID (4초간 강조 표시)
 * - addEvent, toggleDone, toggleAlarm, removeEvent: CRUD 함수들
 * - loading: 데이터 로딩 중 여부
 */

import { useState, useEffect, useCallback } from 'react'

// 현재 시각 "HH:MM" 반환 헬퍼
function getCurrentTimeStr() {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

export function useSchedule() {
  const [events, setEvents]         = useState([])
  const [currentEventId, setCurrentEventId] = useState(null)
  const [flashEventId, setFlashEventId]     = useState(null)  // 알람 강조 표시용
  const [loading, setLoading]       = useState(true)

  // ── 데이터 로드 ──
  useEffect(() => {
    async function loadEvents() {
      try {
        const data = await window.electron.schedule.getAll()
        setEvents(data ?? [])
      } catch (err) {
        console.error('[useSchedule] 일정 로드 실패:', err)
      } finally {
        setLoading(false)
      }
    }
    loadEvents()
  }, [])

  // ── 현재 시간 슬롯 자동 감지 ──
  // 매 분마다 현재 시각과 이벤트 startTime~endTime을 비교해서
  // 어떤 이벤트가 "진행 중"인지 업데이트합니다.
  useEffect(() => {
    function updateCurrentEvent() {
      const now = getCurrentTimeStr()
      // startTime ≤ 현재 < endTime인 이벤트를 "진행 중"으로 표시
      const current = events.find((evt) => {
        return evt.startTime <= now && now < (evt.endTime ?? '23:59')
      })
      setCurrentEventId(current?.id ?? null)
    }

    updateCurrentEvent()  // 즉시 1회 실행

    // 매 30초마다 체크 (1분보다 자주 체크해서 정확도 향상)
    const timer = setInterval(updateCurrentEvent, 30 * 1000)
    return () => clearInterval(timer)  // 컴포넌트 언마운트 시 타이머 제거
  }, [events])  // events가 바뀔 때마다 재실행

  // ── 알람 이벤트 수신 ──
  // Main Process의 scheduler.js가 alarm:fired를 보내면
  // preload.js → window.electron.onAlarmFired 경로로 수신합니다.
  useEffect(() => {
    const cleanup = window.electron.onAlarmFired((eventId) => {
      console.log(`[알람] 이벤트 ${eventId} 알림 수신`)
      setFlashEventId(eventId)  // 해당 슬롯 강조 시작

      // 4초 후 강조 해제 (CSS animation과 타이밍 맞춤)
      setTimeout(() => setFlashEventId(null), 4000)
    })

    // 컴포넌트 언마운트 시 리스너 제거 (메모리 누수 방지)
    return cleanup
  }, [])

  // ── CRUD 함수들 ──

  const addEvent = useCallback(async (eventData) => {
    const updated = await window.electron.schedule.add(eventData)
    setEvents(updated)
  }, [])

  const toggleDone = useCallback(async (id) => {
    // 낙관적 업데이트: 서버 응답 전에 UI를 먼저 바꿔서 반응성 향상
    setEvents((prev) =>
      prev.map((e) => e.id === id ? { ...e, done: !e.done } : e)
    )
    const updated = await window.electron.schedule.toggleDone(id)
    setEvents(updated)  // 실제 저장 결과로 동기화
  }, [])

  const toggleAlarm = useCallback(async (id) => {
    setEvents((prev) =>
      prev.map((e) => e.id === id ? { ...e, alarmEnabled: !e.alarmEnabled } : e)
    )
    const updated = await window.electron.schedule.toggleAlarm(id)
    setEvents(updated)
  }, [])

  const removeEvent = useCallback(async (id) => {
    const updated = await window.electron.schedule.remove(id)
    setEvents(updated)
  }, [])

  return {
    events,
    currentEventId,
    flashEventId,
    loading,
    addEvent,
    toggleDone,
    toggleAlarm,
    removeEvent,
  }
}
