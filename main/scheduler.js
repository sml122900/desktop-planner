/**
 * main/scheduler.js — 알람 스케줄러
 *
 * 동작 원리:
 * 1. 앱이 시작되면 startScheduler()가 호출됩니다.
 * 2. 즉시 1회 checkAlarms()를 실행하고, 이후 매 1분마다 반복합니다.
 * 3. checkAlarms()는 현재 시각(HH:MM)과 오늘 일정의 startTime을 비교합니다.
 * 4. 일치하는 일정이 있고, 아직 알리지 않았다면 OS 알림을 표시합니다.
 * 5. 한 번 알린 일정은 notifiedToday Set에 기록해 중복 알림을 방지합니다.
 * 6. 자정이 되면 notifiedToday를 초기화해서 다음 날 다시 알릴 수 있게 합니다.
 *
 * 왜 Main Process에서 하는가?
 * - Renderer(브라우저)는 탭이 숨겨지거나 최소화되면 타이머가 느려질 수 있습니다.
 * - Main Process(Node.js)는 앱이 실행 중인 한 정확한 타이머를 보장합니다.
 */

const { Notification } = require('electron')

// ─────────────────────────────────────────────
// 오늘 이미 알림을 보낸 이벤트를 추적하는 Set
// Set은 중복을 허용하지 않는 자료구조입니다.
// 키 형식: "YYYY-MM-DD_이벤트ID_HH:MM"
// 예시: "2026-05-05_evt_001_09:00"
// ─────────────────────────────────────────────
const notifiedToday = new Set()

// ─────────────────────────────────────────────
// 헬퍼 함수들
// ─────────────────────────────────────────────

// 현재 시각을 "HH:MM" 형식으로 반환
// 예: 오전 9시 5분 → "09:05"
function getCurrentTimeStr() {
  const now = new Date()
  const h = String(now.getHours()).padStart(2, '0')   // 한 자리면 앞에 0 추가
  const m = String(now.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

// 오늘 날짜를 "YYYY-MM-DD" 형식으로 반환
function getTodayStr() {
  return new Date().toISOString().slice(0, 10)
}

// 오늘 요일이 포함된 반복 설정인지 확인
// dayOfWeek: 0=일요일, 1=월요일 ... 6=토요일
function isEventActiveToday(evt) {
  const today = getTodayStr()
  const dayOfWeek = new Date().getDay()

  if (evt.repeat === 'daily') return true                           // 매일 반복
  if (evt.repeat === 'weekdays') return dayOfWeek >= 1 && dayOfWeek <= 5 // 평일만
  if (evt.repeat === 'none' || !evt.repeat) return evt.date === today    // 특정 날짜만
  return false
}

// ─────────────────────────────────────────────
// 알람 체크 — 매 분마다 호출됩니다
// ─────────────────────────────────────────────
function checkAlarms(widgetWin, store) {
  const currentTime = getCurrentTimeStr()  // 현재 시각 (예: "09:00")
  const today = getTodayStr()              // 오늘 날짜 (예: "2026-05-05")

  // 스토어에서 모든 이벤트 불러오기
  const allEvents = store.get('schedules.events', [])

  for (const evt of allEvents) {
    // ── 알람 발동 조건 체크 ──

    // 1. 알람이 꺼진 이벤트는 건너뜀
    if (evt.alarmEnabled === false) continue

    // 2. 이미 완료 처리된 이벤트는 건너뜀
    if (evt.done) continue

    // 3. 오늘 활성화되는 이벤트가 아니면 건너뜀
    if (!isEventActiveToday(evt)) continue

    // 4. 현재 시각이 이벤트 시작 시각과 일치하는지 확인
    if (evt.startTime !== currentTime) continue

    // 5. 중복 방지: 오늘 이미 이 이벤트에 알림을 보냈는지 확인
    const alarmKey = `${today}_${evt.id}_${evt.startTime}`
    if (notifiedToday.has(alarmKey)) continue

    // ── 모든 조건 통과 → 알림 발송 ──
    notifiedToday.add(alarmKey)  // 발송 기록 추가 (중복 방지)
    fireNotification(evt, widgetWin)
  }
}

// ─────────────────────────────────────────────
// OS 네이티브 알림 표시
// ─────────────────────────────────────────────
function fireNotification(evt, widgetWin) {
  // 이 OS에서 알림을 지원하는지 먼저 확인
  if (!Notification.isSupported()) {
    console.warn('[알람] 이 시스템은 알림을 지원하지 않습니다.')
    return
  }

  // 카테고리 ID → 한국어 레이블 변환
  const categoryLabel = {
    work:     '업무',
    trading:  '트레이딩',
    personal: '개인',
    routine:  '루틴',
  }[evt.category] ?? '일정'  // 알 수 없는 카테고리는 '일정'으로 표시

  // 알림 본문: 부제목이 있으면 "제목 — 부제목", 없으면 "제목"만
  const body = evt.subtitle
    ? `${evt.title} — ${evt.subtitle}`
    : evt.title

  // OS 알림 객체 생성
  const notification = new Notification({
    title: `⏰ ${categoryLabel} 시작`,  // 알림 제목
    body,                               // 알림 내용
    silent: false,                      // false = 알림 소리 재생 (true면 무음)
    timeoutType: 'default',             // 알림이 자동으로 사라지는 시간 (OS 기본값)
  })

  // ── 알림 클릭 이벤트 ──
  notification.on('click', () => {
    // 위젯 창이 존재하고 파괴되지 않았을 때만 실행
    if (widgetWin && !widgetWin.isDestroyed()) {
      // 클릭 통과 해제 (마우스로 상호작용 가능하게)
      widgetWin.setIgnoreMouseEvents(false)
      // 위젯 창을 앞으로 가져옴
      widgetWin.focus()
      // Renderer(React)에게 "이 이벤트에 알람이 울렸어!" 신호 전송
      // ScheduleWidget.jsx에서 이 신호를 받아 해당 슬롯을 강조 표시합니다.
      widgetWin.webContents.send('alarm:fired', evt.id)
    }
  })

  // 알림 표시!
  notification.show()

  console.log(`[알람] "${evt.title}" 알림 발송 (${evt.startTime})`)
}

// ─────────────────────────────────────────────
// 스케줄러 시작
// main/index.js에서 창 로드 완료 후 호출합니다.
// ─────────────────────────────────────────────
function startScheduler(widgetWin, store) {
  console.log('[스케줄러] 알람 스케줄러 시작')

  // 앱 시작 즉시 1회 체크
  // (앱을 열었을 때 마침 일정 시간이면 바로 알림)
  checkAlarms(widgetWin, store)

  // 이후 매 60초(1분)마다 체크
  // setInterval은 지정한 ms마다 함수를 반복 실행합니다.
  const intervalId = setInterval(() => {
    checkAlarms(widgetWin, store)
  }, 60 * 1000) // 60 * 1000ms = 60초

  // 나중에 스케줄러를 멈춰야 할 경우를 위해 intervalId 반환
  return intervalId
}

// ─────────────────────────────────────────────
// 자정 초기화 — 매일 자정 00:00에 알림 기록을 지웁니다
// ─────────────────────────────────────────────
function startMidnightReset() {
  // 현재 시각
  const now = new Date()

  // 오늘 자정(00:00:00)을 나타내는 Date 객체
  // new Date(년, 월(0부터), 일 + 1)로 내일 자정을 계산합니다.
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)

  // 지금부터 자정까지 남은 시간(ms)
  const msUntilMidnight = tomorrow - now

  console.log(`[스케줄러] 자정 초기화까지 ${Math.round(msUntilMidnight / 60000)}분 남음`)

  // 자정에 1회 초기화 실행
  setTimeout(() => {
    console.log('[스케줄러] 자정 → 알림 기록 초기화')
    notifiedToday.clear()  // Set을 비워서 다음 날 알림이 다시 가게 함

    // 이후 매 24시간마다 반복 초기화
    setInterval(() => {
      console.log('[스케줄러] 24시간 주기 → 알림 기록 초기화')
      notifiedToday.clear()
    }, 24 * 60 * 60 * 1000)  // 24시간 = 86,400,000ms

  }, msUntilMidnight)
}

module.exports = { startScheduler, startMidnightReset }
