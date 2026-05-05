# Desktop Planner

바탕화면 위에 항상 떠 있는 일정 & 목표 위젯 앱.
Electron + React + Vite 기반으로 만들어졌습니다.

## 주요 기능

- 오늘 일정 타임슬롯 (현재 진행 중 자동 하이라이트)
- 시작 시간에 OS 네이티브 알람 알림
- 일별/주별/월별 목표 진행률 프로그레스바
- 오늘의 할 일 체크리스트
- 3가지 테마 (Dark Night / Warm Paper / Frosted Glass)
- 3가지 레이아웃 (Horizontal / Top Bar / Sidebar)
- 바탕화면 클릭 통과 (위젯 뒤 아이콘 클릭 가능)

---

## 설치 & 실행

### 1. 필요 환경

- Node.js 18 이상 (https://nodejs.org)
- npm (Node.js 설치 시 함께 설치됨)

### 2. 의존성 설치

```bash
# 프로젝트 폴더에서 실행
npm install
```

### 3. 개발 모드 실행

```bash
npm run dev
```

이 명령어는 두 가지를 동시에 실행합니다:
- Vite 개발 서버 (React UI, localhost:5173)
- Electron (Vite 서버에 연결된 위젯 창)

React 코드를 수정하면 즉시 위젯에 반영됩니다 (Hot Reload).

### 4. 배포 빌드

```bash
npm run build
```

- macOS: `dist/Desktop Planner.dmg` 생성
- Windows: `dist/Desktop Planner Setup.exe` 생성

---

## 프로젝트 구조

```
desktop-planner/
│
├── main/                    # Electron Main Process (Node.js)
│   ├── index.js             # 앱 진입점, 창 생성
│   ├── preload.js           # Main ↔ Renderer 보안 브릿지
│   ├── ipcHandlers.js       # IPC 이벤트 핸들러 (데이터 CRUD)
│   └── scheduler.js         # 알람 스케줄러 (매분 시간 체크)
│
├── renderer/src/            # React Renderer Process
│   ├── main.jsx             # React 앱 진입점
│   ├── App.jsx              # 루트 컴포넌트 (레이아웃 선택)
│   ├── widgets/
│   │   ├── ScheduleWidget.jsx  # 오늘 일정 위젯
│   │   ├── GoalWidget.jsx      # 목표 진행률 위젯
│   │   └── FocusWidget.jsx     # 포커스 & 체크리스트 위젯
│   ├── hooks/
│   │   ├── useConfig.js     # 앱 설정 커스텀 훅
│   │   ├── useSchedule.js   # 일정 데이터 + 알람 수신 훅
│   │   └── useGoals.js      # 목표 & 체크리스트 훅
│   └── styles/
│       └── global.css       # 전역 스타일 & 테마
│
├── assets/
│   └── tray-icon.png        # 트레이 아이콘 (16x16 PNG)
│
├── index.html               # Vite HTML 진입점
├── vite.config.js           # Vite 설정
└── package.json             # 프로젝트 설정 & 스크립트
```

---

## 데이터 저장 위치

앱 데이터는 JSON 파일로 로컬에 저장됩니다.

- macOS: `~/Library/Application Support/desktop-planner/`
- Windows: `%APPDATA%/desktop-planner/`

파일 목록:
- `config.json` — 테마, 레이아웃, 위치, 투명도
- `schedules.json` — 일정 데이터
- `goals.json` — 목표 & 체크리스트

---

## 알람 동작 방식

1. 앱 시작 시 `scheduler.js`가 매 1분마다 타이머 실행
2. 현재 시각(HH:MM)과 각 일정의 `startTime` 비교
3. 일치하고 `alarmEnabled: true`이면 OS 알림 표시
4. 알림 클릭 시 위젯 포커스 + 해당 슬롯 깜빡임 강조
5. 하루 지나면 자정에 알림 기록 초기화

---

## 커스터마이징

### 테마 변경
앱 트레이 아이콘 클릭 → 설정에서 변경

### 새 카테고리 추가
`main/ipcHandlers.js`의 `DEFAULT_SCHEDULES.categories` 배열에 추가:
```js
{ id: 'study', label: '학습', color: 'teal' }
```

### 명언 추가
`renderer/src/widgets/FocusWidget.jsx`의 `QUOTES` 배열에 추가

---

## 트러블슈팅

**알람이 오지 않아요 (macOS)**
- 시스템 환경설정 → 알림 → Desktop Planner → 알림 허용

**위젯이 항상 위에 안 떠요**
- `main/index.js`의 `alwaysOnTop: true` 확인
- 일부 전체화면 앱에서는 위젯이 가려질 수 있습니다.

**트레이 아이콘이 안 보여요**
- `assets/tray-icon.png` 파일이 있는지 확인 (16x16 PNG)
