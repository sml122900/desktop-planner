# 기술 결정: transparent + alwaysOnTop 오버레이 창

**날짜**: 2026-05-05  
**결정자**: sml122900

---

## Problem

바탕화면 위에 항상 떠 있으면서도 아래의 작업(브라우저, 코드 에디터 등)을 가리지 않는 위젯 앱이 필요했다. 일반 창(BrowserWindow 기본값)은 다른 앱과 z-order가 경쟁하므로 포커스를 잃으면 위젯이 가려지고, 사용자가 매번 전환해야 해서 "항상 보이는 위젯" 요구사항을 충족하지 못한다.

## Action

`BrowserWindow` 옵션에 `transparent: true` + `alwaysOnTop: true`를 적용해 OS 레벨 최상위 투명 창으로 생성. 위젯 영역 밖 마우스 이벤트는 `setIgnoreMouseEvents(true, { forward: true })`로 OS에 통과(click-through)시키고, 마우스가 위젯 위로 올라오면 `setIgnoreMouseEvents(false)`로 전환해 인터랙션 가능하게 처리. Renderer에서 `widget-hover` / `widget-leave` IPC 이벤트로 Main에 신호 전달.

## Result

- 바탕화면 작업을 방해하지 않는 상시 표시 위젯 구현 완료
- 3개 위젯(Schedule / Goal / Focus) 동시 표시
- 드래그로 위치 변경 후 `config.json`에 자동 저장

## 포기한 대안

| 대안 | 포기 이유 |
|------|----------|
| 일반 BrowserWindow | 포커스 잃으면 가려짐, 항상 표시 불가 |
| `pointer-events: none` CSS만 사용 | Renderer CSS로는 OS 레벨 click-through 불가, 창 자체가 마우스를 가로막음 |
