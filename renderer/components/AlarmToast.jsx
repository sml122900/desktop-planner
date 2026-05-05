/**
 * renderer/components/AlarmToast.jsx
 * Main Process에서 alarm:fire 이벤트를 받아 화면에 알람 팝업을 표시
 */

import { useState, useEffect, useCallback } from 'react'

const COLOR_MAP = {
  purple: { bg: 'rgba(83,74,183,0.22)', border: 'rgba(142,130,255,0.5)', dot: '#8E82FF' },
  teal:   { bg: 'rgba(29,158,117,0.22)', border: 'rgba(29,158,117,0.5)',  dot: '#1D9E75' },
  amber:  { bg: 'rgba(239,159,39,0.22)', border: 'rgba(239,159,39,0.5)',  dot: '#EF9F27' },
  pink:   { bg: 'rgba(212,83,126,0.22)', border: 'rgba(212,83,126,0.5)',  dot: '#D4537E' },
  gray:   { bg: 'rgba(136,135,128,0.22)', border: 'rgba(136,135,128,0.4)', dot: '#888780' },
}

// ─── 단일 알람 토스트 ─────────────────────────────────────────
function AlarmItem({ alarm, onDismiss, onSnooze }) {
  const [countdown, setCountdown] = useState(8)  // 8초 뒤 자동 닫힘
  const c = COLOR_MAP[alarm.color] ?? COLOR_MAP.purple

  useEffect(() => {
    if (countdown <= 0) {
      onDismiss(alarm.id)
      return
    }
    const t = setTimeout(() => setCountdown(n => n - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown, alarm.id, onDismiss])

  const styles = {
    wrap: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '10px 14px',
      borderRadius: '12px',
      background: c.bg,
      border: `0.5px solid ${c.border}`,
      marginBottom: '8px',
      animation: 'slideIn 0.25s ease',
    },
    dot: {
      width: '8px',
      height: '8px',
      borderRadius: '50%',
      background: c.dot,
      flexShrink: 0,
    },
    content: { flex: 1 },
    time: {
      fontSize: '10px',
      color: 'rgba(255,255,255,0.45)',
      marginBottom: '2px',
    },
    title: {
      fontSize: '13px',
      fontWeight: 500,
      color: 'rgba(255,255,255,0.9)',
    },
    sub: {
      fontSize: '11px',
      color: 'rgba(255,255,255,0.45)',
      marginTop: '2px',
    },
    actions: { display: 'flex', gap: '6px', flexShrink: 0 },
    btnSnooze: {
      fontSize: '11px',
      padding: '4px 8px',
      borderRadius: '6px',
      background: 'rgba(255,255,255,0.1)',
      border: '0.5px solid rgba(255,255,255,0.2)',
      color: 'rgba(255,255,255,0.7)',
      cursor: 'pointer',
    },
    btnDismiss: {
      fontSize: '11px',
      padding: '4px 8px',
      borderRadius: '6px',
      background: 'rgba(255,255,255,0.06)',
      border: '0.5px solid rgba(255,255,255,0.12)',
      color: 'rgba(255,255,255,0.4)',
      cursor: 'pointer',
    },
    countdown: {
      fontSize: '10px',
      color: 'rgba(255,255,255,0.25)',
      minWidth: '14px',
      textAlign: 'center',
    },
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.dot} />
      <div style={styles.content}>
        <div style={styles.time}>{alarm.startTime} 시작</div>
        <div style={styles.title}>{alarm.title}</div>
        {alarm.subtitle && <div style={styles.sub}>{alarm.subtitle}</div>}
      </div>
      <div style={styles.actions}>
        <button style={styles.btnSnooze} onClick={() => onSnooze(alarm.id, 5)}>
          5분 후
        </button>
        <button style={styles.btnDismiss} onClick={() => onDismiss(alarm.id)}>
          확인
        </button>
        <span style={styles.countdown}>{countdown}</span>
      </div>
    </div>
  )
}

// ─── 알람 토스트 컨테이너 ─────────────────────────────────────
export default function AlarmToast() {
  const [alarms, setAlarms] = useState([])

  // Main Process로부터 알람 수신
  useEffect(() => {
    const { ipcRenderer } = window.electron

    const handler = (_, alarmData) => {
      setAlarms(prev => {
        // 중복 방지
        if (prev.find(a => a.id === alarmData.id)) return prev
        return [...prev, alarmData]
      })
    }

    ipcRenderer.on('alarm:fire', handler)
    return () => ipcRenderer.removeListener('alarm:fire', handler)
  }, [])

  const handleDismiss = useCallback((id) => {
    window.electron.ipcRenderer.send('alarm:dismiss', { eventId: id })
    setAlarms(prev => prev.filter(a => a.id !== id))
  }, [])

  const handleSnooze = useCallback((id, minutes) => {
    window.electron.ipcRenderer.send('alarm:snooze', { eventId: id, minutes })
    setAlarms(prev => prev.filter(a => a.id !== id))
  }, [])

  if (alarms.length === 0) return null

  return (
    <>
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div style={{
        position: 'absolute',
        top: '56px',       // top-bar 아래
        right: '16px',
        width: '280px',
        zIndex: 999,
        pointerEvents: 'auto',
      }}>
        {alarms.map(alarm => (
          <AlarmItem
            key={alarm.id}
            alarm={alarm}
            onDismiss={handleDismiss}
            onSnooze={handleSnooze}
          />
        ))}
      </div>
    </>
  )
}
