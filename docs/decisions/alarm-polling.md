# 기술 결정: setInterval 60초 알람 폴링

**날짜**: 2026-05-05  
**결정자**: sml122900

---

## Problem

지정한 시각에 OS 알림을 보내는 알람 기능이 필요하다. 외부 패키지를 추가하지 않고 Main Process에서 단순하게 구현해야 한다. 정밀도는 분 단위면 충분하다 (일정이 HH:MM 단위).

## Action

`scheduler.js`에서 `setInterval(() => { ... }, 60_000)`으로 매분 실행. 현재 시각(HH:MM)과 각 이벤트의 `startTime`을 문자열 비교해 일치하면 `new Notification()`으로 OS 네이티브 알림 발송. 이미 발송한 eventId를 `Set<string>`으로 관리해 같은 분 안에 중복 발송 방지. 알람 발송 시 `alarm:fired` IPC로 Renderer에도 신호 전달해 UI 하이라이트 트리거.

## Result

- 추가 패키지 없이 구현 (node-cron 불필요)
- 코드 40줄 이하의 단순 구조, 유지보수 용이
- 분 단위 정밀도로 일정 알람 신뢰성 있게 동작

## 포기한 대안

| 대안 | 포기 이유 |
|------|----------|
| node-cron | 추가 패키지, 이 규모에 불필요한 의존성 |
| OS 알람 API (task scheduler 등) | 플랫폼별 구현 필요, 복잡도 대비 이점 없음 |
| setTimeout 체이닝 | 다음 이벤트 시각까지 정확히 계산해야 해서 복잡, 이벤트 추가/삭제 시 재스케줄링 필요 |
