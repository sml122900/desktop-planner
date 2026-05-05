/**
 * main/index.js — Electron 앱의 진입점 (Main Process)
 *
 * Main Process는 앱의 "백엔드" 역할을 합니다.
 * - 창(BrowserWindow) 생성 및 관리
 * - 트레이 아이콘 (시스템 메뉴바의 작은 아이콘)
 * - OS와 직접 대화 (파일, 알림, 시스템 이벤트)
 *
 * Renderer Process(React UI)와는 IPC(메시지 통신)로만 대화합니다.
 */

const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain } = require('electron')
const path = require('path')
const Store = require('electron-store')
const { startScheduler, startMidnightReset } = require('./scheduler')
const { registerIpcHandlers } = require('./ipcHandlers')

// ─────────────────────────────────────────────
// electron-store: JSON 파일로 설정/데이터를 저장하는 라이브러리
// 저장 위치: ~/Library/Application Support/desktop-planner/ (macOS)
//            %APPDATA%/desktop-planner/ (Windows)
// ─────────────────────────────────────────────
const store = new Store()

// 창과 트레이 객체를 모듈 전역으로 보관
// (가비지 컬렉터가 지우지 못하도록 전역 변수에 유지)
let widgetWin = null   // 바탕화면 위젯 창
let settingsWin = null // 설정 창
let tray = null        // 시스템 트레이 아이콘

// ─────────────────────────────────────────────
// 위젯 창 생성
// ─────────────────────────────────────────────
function createWidgetWindow() {
  // 저장된 위치 불러오기 (없으면 기본값 x:40, y:60)
  const pos = store.get('config.position', { x: 40, y: 60 })
  // 저장된 투명도 불러오기 (없으면 기본값 0.85)
  const opacity = store.get('config.opacity', 0.85)

  widgetWin = new BrowserWindow({
    x: pos.x,
    y: pos.y,
    width: 720,
    height: 500,

    // ── 위젯처럼 보이게 하는 핵심 옵션들 ──
    frame: false,           // 제목바(닫기/최소화 버튼) 제거
    transparent: true,      // 창 배경을 투명하게 (위젯 뒤로 배경화면이 보임)
    alwaysOnTop: true,      // 다른 앱 위에 항상 표시
    skipTaskbar: true,      // 작업표시줄(Dock)에 표시하지 않음
    resizable: false,       // 크기 조절 불가

    // 보안 설정
    webPreferences: {
      // preload.js를 통해서만 Node.js API를 안전하게 노출
      preload: path.join(__dirname, 'preload.js'),
      // contextIsolation: Renderer가 직접 Node.js에 접근하지 못하게 격리
      contextIsolation: true,
      // nodeIntegration: false가 기본값 — Renderer에서 require() 사용 불가 (보안)
      nodeIntegration: false,
    },
  })

  // 투명도 설정
  widgetWin.setOpacity(opacity)

  // ── 개발 vs 배포 환경 분기 ──
  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    // 개발 중: Vite 로컬 서버에서 React 앱 로드
    widgetWin.loadURL('http://localhost:5173')
    // 필요 시 아래 주석 해제하면 개발자 도구가 열립니다
    // widgetWin.webContents.openDevTools({ mode: 'detach' })
  } else {
    // 배포 후: 빌드된 정적 파일 로드
    widgetWin.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  // ── 클릭 통과(Click-through) 설정 ──
  // 위젯이 화면 위에 떠 있어도 바탕화면 아이콘 클릭이 가능하도록
  // true = 마우스 이벤트를 아래 창으로 통과시킴
  // forward: true = 마우스 위치 정보도 Renderer에 계속 전달 (hover 감지용)
  widgetWin.setIgnoreMouseEvents(true, { forward: true })

  // ── Renderer에서 오는 마우스 이벤트 처리 ──
  // Renderer(React)에서 마우스가 위젯 위에 올라오면 → 클릭 통과 해제
  ipcMain.on('widget-hover', () => {
    widgetWin.setIgnoreMouseEvents(false)
  })
  // 마우스가 위젯을 벗어나면 → 다시 클릭 통과 활성화
  ipcMain.on('widget-leave', () => {
    widgetWin.setIgnoreMouseEvents(true, { forward: true })
  })

  // ── 위젯 드래그로 이동 후 위치 저장 ──
  widgetWin.on('moved', () => {
    const [x, y] = widgetWin.getPosition()
    store.set('config.position', { x, y })
  })

  // ── 창이 완전히 로드되면 스케줄러 시작 ──
  widgetWin.webContents.once('did-finish-load', () => {
    // 알람 스케줄러 시작 (매 분마다 일정 시간 체크)
    startScheduler(widgetWin, store)
    // 자정 00:00에 "오늘 알린 목록" 초기화
    startMidnightReset()
  })

  return widgetWin
}

// ─────────────────────────────────────────────
// 설정 창 생성
// ─────────────────────────────────────────────
function createSettingsWindow() {
  // 이미 열려있으면 포커스만 하고 새로 만들지 않음
  if (settingsWin && !settingsWin.isDestroyed()) {
    settingsWin.focus()
    return
  }

  settingsWin = new BrowserWindow({
    width: 480,
    height: 640,
    title: 'Desktop Planner 설정',
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  // 설정 창은 '#/settings' 해시 라우트로 이동
  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    settingsWin.loadURL('http://localhost:5173/#/settings')
  } else {
    settingsWin.loadFile(path.join(__dirname, '../dist/index.html'), {
      hash: 'settings',
    })
  }

  // 창 닫힐 때 null로 초기화 (다음에 다시 만들 수 있도록)
  settingsWin.on('closed', () => { settingsWin = null })
}

// ─────────────────────────────────────────────
// 시스템 트레이 아이콘 생성
// 트레이 = macOS 메뉴바 / Windows 작업표시줄 우측의 작은 아이콘
// ─────────────────────────────────────────────
function createTray() {
  // 트레이 아이콘 이미지 (없으면 빈 이미지 사용)
  let icon
  try {
    icon = nativeImage.createFromPath(path.join(__dirname, '../assets/tray-icon.png'))
    icon = icon.resize({ width: 16, height: 16 }) // macOS 트레이 표준 크기
  } catch {
    icon = nativeImage.createEmpty()
  }

  tray = new Tray(icon)
  tray.setToolTip('Desktop Planner')

  // 트레이 우클릭 메뉴
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '위젯 보기 / 숨기기',
      click: () => {
        // 위젯이 보이면 숨기고, 숨겨져 있으면 다시 보이게
        if (widgetWin.isVisible()) {
          widgetWin.hide()
        } else {
          widgetWin.show()
        }
      },
    },
    { label: '설정 열기', click: createSettingsWindow },
    { type: 'separator' }, // 구분선
    { label: '종료', role: 'quit' }, // role: 'quit'은 모든 OS에서 올바르게 앱을 종료
  ])

  tray.setContextMenu(contextMenu)

  // macOS: 트레이 아이콘 좌클릭 시 설정 창 열기
  tray.on('click', createSettingsWindow)
}

// ─────────────────────────────────────────────
// 앱 생명주기 이벤트
// ─────────────────────────────────────────────

// app.whenReady(): Electron이 완전히 초기화된 후 실행
app.whenReady().then(() => {
  // IPC 핸들러 먼저 등록 (Renderer가 요청을 보내기 전에 준비되어 있어야 함)
  registerIpcHandlers(store)

  // 창과 트레이 생성
  createWidgetWindow()
  createTray()

  // macOS: 독(Dock)에서 앱 아이콘 클릭 시 창이 없으면 새로 만들기
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWidgetWindow()
    }
  })
})

// 모든 창이 닫혀도 앱을 종료하지 않음
// 트레이 아이콘으로 계속 실행 상태 유지
app.on('window-all-closed', (e) => {
  e.preventDefault() // 기본 종료 동작 막기
})
