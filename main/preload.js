/**
 * main/preload.js — Main Process와 Renderer Process 사이의 보안 브릿지
 *
 * Electron 보안 모델:
 * - Renderer(React)는 Node.js에 직접 접근하면 안 됩니다.
 *   (악의적인 웹 콘텐츠가 파일 시스템을 건드릴 수 있기 때문)
 * - preload.js는 창이 로드되기 전에 실행되는 특별한 스크립트로,
 *   '허용된 기능만' window.electron 객체에 담아서 Renderer에 노출합니다.
 * - contextBridge.exposeInMainWorld(): 격리된 컨텍스트에서 안전하게 API를 공개하는 메서드
 *
 * 즉, Renderer는 window.electron.xxx()만 호출할 수 있고,
 * 그 외 Node.js 기능에는 접근 불가합니다.
 */

const { contextBridge, ipcRenderer } = require('electron')

// window.electron 객체로 Renderer에 노출할 API 정의
contextBridge.exposeInMainWorld('electron', {

  // ─────────────────────────────────────────────
  // 스토어(데이터 저장소) API
  // ─────────────────────────────────────────────

  // 특정 키의 값 읽기
  // 예: window.electron.store.get('schedules.events')
  store: {
    get: (key) => ipcRenderer.invoke('store:get', key),
    set: (key, value) => ipcRenderer.invoke('store:set', key, value),
  },

  // ─────────────────────────────────────────────
  // 일정(Schedule) 관련 API
  // ─────────────────────────────────────────────
  schedule: {
    // 오늘 일정 전체 가져오기
    getAll: () => ipcRenderer.invoke('schedule:getAll'),
    // 새 일정 추가
    add: (event) => ipcRenderer.invoke('schedule:add', event),
    // 일정 수정
    update: (id, data) => ipcRenderer.invoke('schedule:update', id, data),
    // 일정 삭제
    remove: (id) => ipcRenderer.invoke('schedule:remove', id),
    // 일정 완료 처리 토글 (완료 ↔ 미완료)
    toggleDone: (id) => ipcRenderer.invoke('schedule:toggleDone', id),
    // 특정 일정의 알람 on/off 토글
    toggleAlarm: (id) => ipcRenderer.invoke('schedule:toggleAlarm', id),
  },

  // ─────────────────────────────────────────────
  // 목표(Goal) 관련 API
  // ─────────────────────────────────────────────
  goal: {
    // 목표 전체 가져오기
    getAll: () => ipcRenderer.invoke('goal:getAll'),
    // 새 목표 추가
    add: (goal) => ipcRenderer.invoke('goal:add', goal),
    // 목표 진행률 업데이트
    update: (id, current) => ipcRenderer.invoke('goal:update', id, current),
    // 목표 삭제
    remove: (id) => ipcRenderer.invoke('goal:remove', id),
  },

  // ─────────────────────────────────────────────
  // 체크리스트 API
  // ─────────────────────────────────────────────
  checklist: {
    // 오늘의 체크리스트 가져오기
    getToday: () => ipcRenderer.invoke('checklist:getToday'),
    // 항목 완료 토글
    toggle: (id) => ipcRenderer.invoke('checklist:toggle', id),
    // 새 항목 추가
    add: (title) => ipcRenderer.invoke('checklist:add', title),
    // 항목 삭제
    remove: (id) => ipcRenderer.invoke('checklist:remove', id),
  },

  // ─────────────────────────────────────────────
  // 마우스 이벤트 (클릭 통과 제어용)
  // ─────────────────────────────────────────────
  mouse: {
    // 위젯에 마우스가 올라왔을 때 → 클릭 통과 해제
    hover: () => ipcRenderer.send('widget-hover'),
    // 위젯에서 마우스가 나갔을 때 → 클릭 통과 활성화
    leave: () => ipcRenderer.send('widget-leave'),
  },

  // ─────────────────────────────────────────────
  // 알람 이벤트 수신 (Main → Renderer 단방향)
  // ─────────────────────────────────────────────
  onAlarmFired: (callback) => {
    // Main Process가 'alarm:fired' 이벤트를 보내면 callback 실행
    // callback(eventId): 알람이 울린 일정의 ID를 전달받음
    ipcRenderer.on('alarm:fired', (_, eventId) => callback(eventId))
    // 컴포넌트가 언마운트될 때 리스너를 제거할 수 있도록 제거 함수 반환
    return () => ipcRenderer.removeAllListeners('alarm:fired')
  },

  // ─────────────────────────────────────────────
  // 설정(Config) API
  // ─────────────────────────────────────────────
  config: {
    get: () => ipcRenderer.invoke('config:get'),
    set: (config) => ipcRenderer.invoke('config:set', config),
  },
})
