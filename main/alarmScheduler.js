/**
 * alarmScheduler.js
 * 오늘 일정의 시작 시간에 맞춰 알람을 발생시키는 모듈
 * Main Process에서 실행됨
 */

const { Notification, ipcMain } = require('electron')
const path = require('path')

class AlarmScheduler {
  constructor(store, getWidgetWin) {
    this.store = store
    this.getWidgetWin = getWidgetWin  // BrowserWindow getter (함수로 받아 순환참조 방지)
    this.timers = new Map()           // eventId → timeoutId
    this.snoozedAlarms = new Map()    // eventId → snooze timeoutId
  }

  // ─── 앱 시작 / 일정 변경 시 호출 ───────────────────────────────
  schedule() {
    this._clearAll()

    const events = this.store.get('schedules.events', [])
    const todayStr = this._todayStr()

    const todayEvents = events.filter(evt => {
      // 오늘 날짜 이벤트 OR repeat 설정(weekdays / daily)으로 오늘에 해당하는 이벤트
      if (evt.date === todayStr) return true
      if (evt.repeat === 'daily') return true
      if (evt.repeat === 'weekdays') {
        const day = new Date().getDay() // 0=일, 6=토
        return day >= 1 && day <= 5
      }
      return false
    })

    todayEvents.forEach(evt => this._scheduleOne(evt))

    console.log(`[AlarmScheduler] ${todayEvents.length}개 일정 알람 등록 완료`)
  }

  // ─── 단일 이벤트 타이머 등록 ──────────────────────────────────
  _scheduleOne(evt) {
    const msUntil = this._msUntilTime(evt.startTime)
    if (msUntil < 0) return  // 이미 지난 시간은 스킵

    const timerId = setTimeout(() => {
      this._fireAlarm(evt)
    }, msUntil)

    this.timers.set(evt.id, timerId)
    console.log(`[AlarmScheduler] "${evt.title}" 알람 등록 → ${evt.startTime} (${Math.round(msUntil / 60000)}분 후)`)
  }

  // ─── 알람 발동 ────────────────────────────────────────────────
  _fireAlarm(evt) {
    // 1) OS 네이티브 알림
    if (Notification.isSupported()) {
      const notif = new Notification({
        title: `⏰ ${evt.startTime} — ${evt.title}`,
        body: evt.subtitle || '일정 시작 시간입니다',
        icon: path.join(__dirname, '../assets/tray-icon.png'),
        silent: false,
        actions: [
          { type: 'button', text: '5분 후 다시 알림' },
          { type: 'button', text: '확인' },
        ],
        closeButtonText: '닫기',
      })

      notif.on('action', (_, idx) => {
        if (idx === 0) this._snooze(evt, 5)  // 5분 스누즈
      })

      notif.show()
    }

    // 2) Renderer(위젯)에 알람 이벤트 전송 → 화면 내 팝업 표시
    const win = this.getWidgetWin()
    if (win && !win.isDestroyed()) {
      win.webContents.send('alarm:fire', {
        id: evt.id,
        title: evt.title,
        subtitle: evt.subtitle,
        startTime: evt.startTime,
        color: evt.color,
      })
    }

    // 타이머 맵에서 제거
    this.timers.delete(evt.id)
  }

  // ─── 스누즈 ───────────────────────────────────────────────────
  _snooze(evt, minutes) {
    // 기존 스누즈 타이머 있으면 취소
    if (this.snoozedAlarms.has(evt.id)) {
      clearTimeout(this.snoozedAlarms.get(evt.id))
    }

    const snoozeId = setTimeout(() => {
      this._fireAlarm(evt)
      this.snoozedAlarms.delete(evt.id)
    }, minutes * 60 * 1000)

    this.snoozedAlarms.set(evt.id, snoozeId)
    console.log(`[AlarmScheduler] "${evt.title}" ${minutes}분 스누즈`)
  }

  // ─── IPC 핸들러 등록 ──────────────────────────────────────────
  registerIpc() {
    // Renderer에서 스누즈 요청
    ipcMain.on('alarm:snooze', (_, { eventId, minutes }) => {
      const events = this.store.get('schedules.events', [])
      const evt = events.find(e => e.id === eventId)
      if (evt) this._snooze(evt, minutes)
    })

    // Renderer에서 알람 수동 해제
    ipcMain.on('alarm:dismiss', (_, { eventId }) => {
      if (this.snoozedAlarms.has(eventId)) {
        clearTimeout(this.snoozedAlarms.get(eventId))
        this.snoozedAlarms.delete(eventId)
      }
    })

    // 일정이 변경되면 전체 재스케줄
    ipcMain.on('alarm:reschedule', () => {
      this.schedule()
    })
  }

  // ─── 유틸 ─────────────────────────────────────────────────────
  _msUntilTime(timeStr) {
    // timeStr = "HH:MM"
    const [h, m] = timeStr.split(':').map(Number)
    const now = new Date()
    const target = new Date()
    target.setHours(h, m, 0, 0)
    return target - now
  }

  _todayStr() {
    return new Date().toISOString().slice(0, 10)  // "YYYY-MM-DD"
  }

  _clearAll() {
    this.timers.forEach(id => clearTimeout(id))
    this.timers.clear()
    this.snoozedAlarms.forEach(id => clearTimeout(id))
    this.snoozedAlarms.clear()
  }

  destroy() {
    this._clearAll()
  }
}

module.exports = AlarmScheduler
