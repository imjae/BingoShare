# BingoShare

커스텀 빙고판을 만들어 **링크 하나로 공유**하고, 각자 진행하면서 서로의 현황을 보는 웹앱.

- 설계: [Docs/PLAN.md](Docs/PLAN.md)
- 배포: [Docs/DEPLOY.md](Docs/DEPLOY.md)

## 현재 상태

**M0 — 뼈대.** Vite + React + TypeScript + Tailwind 위에 모바일 우선 화면 껍데기가 올라가 있다.
빙고판은 아직 겉모습 확인용 고정 예시이고, 판 만들기·링크 공유는 M1에서 붙인다.

## 실행

```
npm install
npm run dev
```

| 명령 | 하는 일 |
|---|---|
| `npm run dev` | 개발 서버 |
| `npm run build` | 프로덕션 빌드 (타입 검사 포함) |
| `npm run preview` | 빌드 결과를 그대로 띄워보기 |
| `npm run lint` | oxlint |
