# 이력서 소재 모음 (PAR 형식)

> **PAR**: Problem → Action → Result  
> 각 항목을 아래 템플릿으로 채운다. 수치화 가능한 결과는 반드시 숫자로 표현한다.

---

## 템플릿

### [프로젝트/기능명]

- **Problem**: 어떤 문제 또는 필요가 있었는가?
- **Action**: 내가 구체적으로 무엇을 했는가? (기술·방법론 포함)
- **Result**: 결과는 어떻게 되었는가? (수치, 개선 전후 비교)

---

## 소재 목록

---

### [Desktop Planner] Electron 투명 오버레이 위젯 — 2026-05-05

- **Problem**: 바탕화면을 가리지 않으면서 일정·목표를 항상 화면에 표시하는 위젯이 필요했다. 기존 일반 창은 작업 중 전환해야 해서 사용성이 낮았다.
- **Action**: Electron `BrowserWindow`에 `transparent: true` + `alwaysOnTop: true` 적용, `setIgnoreMouseEvents`로 위젯 영역 밖 마우스 이벤트를 OS에 통과시키는 click-through 구현. 마우스 hover 감지로 투명도를 동적으로 전환해 가독성과 투과성 양립.
- **Result**: 데스크톱 작업을 전혀 방해하지 않는 상시 표시 오버레이 완성. 3개 위젯(일정/목표/포커스) 동시 표시, 드래그로 위치 저장 가능.

---

### [Desktop Planner] 외부 의존성 없는 오프라인 알람 시스템 — 2026-05-05

- **Problem**: 서버·네트워크 없이 동작하면서도 지정 시각에 OS 알림을 보내야 했다. node-cron 같은 추가 패키지를 늘리지 않고 싶었다.
- **Action**: `setInterval` 60초 폴링으로 현재 시각과 일정 시작 시각을 매칭, Electron `Notification` API로 OS 네이티브 알림 발송. 이미 발송한 eventId를 Set으로 관리해 중복 알람 방지.
- **Result**: 추가 패키지 없이 분 단위 정밀도 알람 동작. 완전 오프라인 환경에서도 신뢰성 있게 작동.

---

### [Desktop Planner] IPC 기반 낙관적 업데이트 상태 관리 — 2026-05-05

- **Problem**: Electron Main↔Renderer 간 비동기 IPC 호출 시 UI 응답성이 떨어지고, 매 CRUD마다 재조회 호출이 늘어나는 구조를 피하고 싶었다.
- **Action**: 모든 IPC CRUD 핸들러가 갱신된 전체 배열을 즉시 반환하도록 설계. React hooks에서 먼저 setState로 UI를 즉시 반영(낙관적 업데이트)한 뒤 IPC 응답으로 확정 상태 동기화.
- **Result**: 재조회 IPC 호출 0건. UI 지연 없이 즉각 반응하면서 Main Process와 데이터 일관성 유지.
