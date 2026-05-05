# 기술 결정: electron-store (로컬 JSON 영속 저장)

**날짜**: 2026-05-05  
**결정자**: sml122900

---

## Problem

앱 재시작 후에도 일정·목표·설정 데이터가 유지되어야 한다. 외부 API 없이 완전 오프라인으로 동작해야 하며, 설치형 데스크톱 앱이므로 서버 비용이나 네트워크 의존성이 없어야 한다.

## Action

`electron-store`를 사용해 OS 앱 데이터 디렉터리(`%APPDATA%` / `~/Library/Application Support`)에 JSON 파일로 저장. `schedules.json` / `goals.json` / `config.json` 3개 파일로 도메인 분리. IPC 핸들러(`ipcHandlers.js`)에서 store 인스턴스를 직접 참조해 CRUD 수행.

## Result

- 서버·네트워크·DB 없이 완전 오프라인 동작
- 설정 1줄로 스키마 기본값 정의 가능 (`defaults` 옵션)
- JSON이라 디버깅 시 파일 직접 열람 가능 (단, 앱 실행 중 직접 편집 금지)

## 포기한 대안

| 대안 | 포기 이유 |
|------|----------|
| SQLite (better-sqlite3) | 네이티브 바이너리 → Electron rebuild 필요, 이 규모에 과도한 복잡도 |
| 클라우드 DB (Firebase 등) | 외부 API 의존성 생김, 오프라인 동작 불가, 비용 발생 가능 |
| localStorage (Renderer) | Electron에서 데이터 경로 불안정, Main Process 접근 불가, 마이그레이션 어려움 |
