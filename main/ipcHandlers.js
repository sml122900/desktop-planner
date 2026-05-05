/**
 * main/ipcHandlers.js — IPC 이벤트 핸들러 모음
 *
 * IPC(Inter-Process Communication)란?
 * - Main Process와 Renderer Process는 서로 다른 프로세스이므로 직접 함수 호출이 불가능합니다.
 * - 대신 ipcMain / ipcRenderer를 통해 메시지를 주고받습니다.
 *
 * ipcMain.handle(채널명, 핸들러):
 *   - Renderer에서 ipcRenderer.invoke(채널명, 데이터)를 호출하면 실행됩니다.
 *   - 핸들러의 return 값이 Renderer에게 결과로 돌아갑니다. (비동기 Promise)
 *
 * 예시 흐름:
 *   Renderer: const events = await window.electron.schedule.getAll()
 *     → preload:  ipcRenderer.invoke('schedule:getAll')
 *     → main:     ipcMain.handle('schedule:getAll', ...) 실행
 *     → return:   store에서 읽은 데이터를 Renderer로 반환
 */

const { ipcMain } = require('electron')

// 오늘 날짜를 'YYYY-MM-DD' 형식으로 반환하는 헬퍼 함수
function getTodayStr() {
  return new Date().toISOString().slice(0, 10)
}

// ─────────────────────────────────────────────
// 기본 데이터 구조 (처음 실행 시 스토어가 비어있을 때 사용)
// ─────────────────────────────────────────────
const DEFAULT_SCHEDULES = {
  version: 1,
  events: [
    {
      id: 'evt_example_1',
      title: '아침 루틴',
      subtitle: '스트레칭 + 독서 30분',
      startTime: '09:00',
      endTime: '09:30',
      category: 'routine',
      color: 'gray',
      repeat: 'daily', // 'daily' | 'weekdays' | 'none'
      alarmEnabled: true,
      done: false,
    },
    {
      id: 'evt_example_2',
      title: '프로젝트 개발',
      subtitle: 'media diary 기능 추가',
      startTime: '10:30',
      endTime: '13:00',
      category: 'work',
      color: 'purple',
      repeat: 'weekdays',
      alarmEnabled: true,
      done: false,
    },
    {
      id: 'evt_example_3',
      title: '트레이딩 분석',
      subtitle: 'ETH / BTC 포지션 점검',
      startTime: '16:00',
      endTime: '17:00',
      category: 'trading',
      color: 'amber',
      repeat: 'daily',
      alarmEnabled: true,
      done: false,
    },
  ],
  categories: [
    { id: 'work',     label: '업무',    color: 'purple' },
    { id: 'trading',  label: '트레이딩', color: 'amber'  },
    { id: 'personal', label: '개인',    color: 'teal'   },
    { id: 'routine',  label: '루틴',    color: 'gray'   },
  ],
}

const DEFAULT_GOALS = {
  version: 1,
  goals: [
    {
      id: 'goal_example_1',
      title: 'media diary 완성',
      period: 'month',    // 'day' | 'week' | 'month' | 'quarter'
      target: 100,
      current: 78,
      unit: '%',
      color: 'purple',
      deadline: '',
    },
    {
      id: 'goal_example_2',
      title: '트레이딩 시드 성장',
      period: 'month',
      target: 100,
      current: 64,
      unit: '%',
      color: 'teal',
      deadline: '',
    },
    {
      id: 'goal_example_3',
      title: '영화 10편 감상',
      period: 'month',
      target: 10,
      current: 4,
      unit: '편',
      color: 'amber',
      deadline: '',
    },
  ],
  dailyChecklist: [],
}

const DEFAULT_CONFIG = {
  theme: 'dark-night',           // 'dark-night' | 'warm-paper' | 'frosted'
  layout: 'horizontal-split',   // 'horizontal-split' | 'top-bar-3col' | 'sidebar'
  opacity: 0.85,                 // 위젯 투명도 (0.2 ~ 1.0)
  position: { x: 40, y: 60 },  // 위젯 화면 위치
  widgetOrder: ['schedule', 'goals', 'focus'],
  autoHide: { enabled: true, afterSeconds: 30 },
  quote: { mode: 'random', custom: '' },
  language: 'ko',
}

// ─────────────────────────────────────────────
// 오늘 날짜에 해당하는 이벤트만 필터링하는 헬퍼
// ─────────────────────────────────────────────
function filterTodayEvents(events) {
  const today = getTodayStr()
  const dayOfWeek = new Date().getDay() // 0=일, 1=월, ..., 6=토

  return events.filter((evt) => {
    // 반복 설정에 따라 오늘 표시 여부 결정
    if (evt.repeat === 'daily') return true
    if (evt.repeat === 'weekdays') return dayOfWeek >= 1 && dayOfWeek <= 5
    if (evt.repeat === 'none' || !evt.repeat) return evt.date === today
    return false
  })
}

// ─────────────────────────────────────────────
// 모든 IPC 핸들러 등록 함수
// main/index.js에서 registerIpcHandlers(store)로 호출합니다.
// ─────────────────────────────────────────────
function registerIpcHandlers(store) {

  // ── 스토어 기본값 초기화 ──
  // 처음 실행 시 스토어가 비어있으면 기본 데이터로 채움
  if (!store.has('schedules')) store.set('schedules', DEFAULT_SCHEDULES)
  if (!store.has('goals'))     store.set('goals',     DEFAULT_GOALS)
  if (!store.has('config'))    store.set('config',     DEFAULT_CONFIG)

  // ══════════════════════════════════════════
  // 스토어 범용 핸들러 (직접 키-값 접근)
  // ══════════════════════════════════════════

  ipcMain.handle('store:get', (_, key) => {
    return store.get(key)
  })

  ipcMain.handle('store:set', (_, key, value) => {
    store.set(key, value)
    return true
  })

  // ══════════════════════════════════════════
  // 설정(Config) 핸들러
  // ══════════════════════════════════════════

  ipcMain.handle('config:get', () => {
    // 저장된 설정이 없으면 기본값 반환
    return store.get('config', DEFAULT_CONFIG)
  })

  ipcMain.handle('config:set', (_, newConfig) => {
    // 기존 설정에 새 설정을 병합 (Object.assign 방식)
    const current = store.get('config', DEFAULT_CONFIG)
    store.set('config', { ...current, ...newConfig })
    return true
  })

  // ══════════════════════════════════════════
  // 일정(Schedule) 핸들러
  // ══════════════════════════════════════════

  // 오늘 일정 전체 가져오기
  ipcMain.handle('schedule:getAll', () => {
    const all = store.get('schedules.events', [])
    // 오늘 날짜에 해당하는 이벤트만 필터링해서 반환
    return filterTodayEvents(all)
  })

  // 새 일정 추가
  ipcMain.handle('schedule:add', (_, event) => {
    const events = store.get('schedules.events', [])
    const newEvent = {
      id: `evt_${Date.now()}`,  // 고유 ID: 타임스탬프 사용
      alarmEnabled: true,        // 새 일정은 기본으로 알람 켜짐
      done: false,
      ...event,                  // 전달받은 데이터로 덮어씀
    }
    events.push(newEvent)
    store.set('schedules.events', events)
    return filterTodayEvents(events)
  })

  // 일정 수정
  ipcMain.handle('schedule:update', (_, id, data) => {
    const events = store.get('schedules.events', [])
    const idx = events.findIndex((e) => e.id === id)
    if (idx !== -1) {
      // 해당 인덱스의 이벤트를 업데이트 (기존 필드 유지 + 새 데이터 병합)
      events[idx] = { ...events[idx], ...data }
      store.set('schedules.events', events)
    }
    return filterTodayEvents(events)
  })

  // 일정 삭제
  ipcMain.handle('schedule:remove', (_, id) => {
    const events = store.get('schedules.events', [])
    const filtered = events.filter((e) => e.id !== id)
    store.set('schedules.events', filtered)
    return filterTodayEvents(filtered)
  })

  // 일정 완료 토글 (완료 ↔ 미완료)
  ipcMain.handle('schedule:toggleDone', (_, id) => {
    const events = store.get('schedules.events', [])
    const idx = events.findIndex((e) => e.id === id)
    if (idx !== -1) {
      events[idx].done = !events[idx].done
      store.set('schedules.events', events)
    }
    return filterTodayEvents(events)
  })

  // 알람 on/off 토글
  ipcMain.handle('schedule:toggleAlarm', (_, id) => {
    const events = store.get('schedules.events', [])
    const idx = events.findIndex((e) => e.id === id)
    if (idx !== -1) {
      events[idx].alarmEnabled = !events[idx].alarmEnabled
      store.set('schedules.events', events)
    }
    return filterTodayEvents(events)
  })

  // ══════════════════════════════════════════
  // 목표(Goal) 핸들러
  // ══════════════════════════════════════════

  ipcMain.handle('goal:getAll', () => {
    return store.get('goals.goals', [])
  })

  ipcMain.handle('goal:add', (_, goal) => {
    const goals = store.get('goals.goals', [])
    const newGoal = {
      id: `goal_${Date.now()}`,
      current: 0,
      color: 'purple',
      ...goal,
    }
    goals.push(newGoal)
    store.set('goals.goals', goals)
    return goals
  })

  // 목표 진행률 업데이트
  // current: 현재 달성값 (예: 78% → 78)
  ipcMain.handle('goal:update', (_, id, current) => {
    const goals = store.get('goals.goals', [])
    const idx = goals.findIndex((g) => g.id === id)
    if (idx !== -1) {
      goals[idx].current = current
      store.set('goals.goals', goals)
    }
    return goals
  })

  ipcMain.handle('goal:remove', (_, id) => {
    const goals = store.get('goals.goals', [])
    const filtered = goals.filter((g) => g.id !== id)
    store.set('goals.goals', filtered)
    return filtered
  })

  // ══════════════════════════════════════════
  // 체크리스트 핸들러
  // ══════════════════════════════════════════

  // 오늘의 체크리스트 가져오기
  ipcMain.handle('checklist:getToday', () => {
    const today = getTodayStr()
    const all = store.get('goals.dailyChecklist', [])
    // 오늘 날짜의 항목만 반환
    return all.filter((item) => item.date === today)
  })

  // 체크리스트 항목 완료 토글
  ipcMain.handle('checklist:toggle', (_, id) => {
    const today = getTodayStr()
    const all = store.get('goals.dailyChecklist', [])
    const idx = all.findIndex((item) => item.id === id)
    if (idx !== -1) {
      all[idx].done = !all[idx].done
      store.set('goals.dailyChecklist', all)
    }
    return all.filter((item) => item.date === today)
  })

  // 체크리스트 항목 추가
  ipcMain.handle('checklist:add', (_, title) => {
    const today = getTodayStr()
    const all = store.get('goals.dailyChecklist', [])
    const newItem = {
      id: `chk_${Date.now()}`,
      title,
      done: false,
      date: today, // 오늘 날짜에 귀속
    }
    all.push(newItem)
    store.set('goals.dailyChecklist', all)
    return all.filter((item) => item.date === today)
  })

  // 체크리스트 항목 삭제
  ipcMain.handle('checklist:remove', (_, id) => {
    const today = getTodayStr()
    const all = store.get('goals.dailyChecklist', [])
    const filtered = all.filter((item) => item.id !== id)
    store.set('goals.dailyChecklist', filtered)
    return filtered.filter((item) => item.date === today)
  })
}

module.exports = { registerIpcHandlers }
