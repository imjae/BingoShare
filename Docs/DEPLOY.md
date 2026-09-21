# 배포

**현재 배포 주소: https://imjae.github.io/BingoShare/**

- 저장소: https://github.com/imjae/BingoShare (공개)
- 방식: GitHub Pages, 빌드 소스는 GitHub Actions
- 설정 완료일: 2026-09-21

`main`에 푸시하면 [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml)이
린트 → 빌드 → 배포까지 자동으로 진행한다. **사람이 더 할 일은 없다.**

빌드 결과(`dist/`)는 순수 정적 파일이다. `vite.config.ts`에서 `base: './'`로 두었기 때문에
루트든 하위 경로든 어디에 올려도 동작한다. 호스팅을 갈아타도 코드를 고칠 일이 없다.

---

## 배포 확인

```
git push
```

이후 https://github.com/imjae/BingoShare/actions 에서 진행 상황을 본다.
보통 1~2분이면 끝나고, 반영까지 조금 더 걸릴 수 있다.

---

## 로컬에서 확인

```
npm install
npm run dev              # 개발 서버
npm run build            # 프로덕션 빌드 (타입 검사 포함)
npm run preview          # 빌드 결과를 그대로 띄워보기
```

---

## 나중에 옮기고 싶다면 — Cloudflare Pages

설정 파일이 필요 없다. 대시보드에서 저장소를 연결하고 아래만 넣으면 된다.

| 항목 | 값 |
|---|---|
| 빌드 명령 | `npm run build` |
| 출력 디렉터리 | `dist` |
| Node 버전 | `24` |

GitHub Pages보다 나은 점: **비공개 저장소도 무료로 배포된다.** 나중에 저장소를 비공개로
돌리고 싶어지면 이쪽으로 옮기면 된다.
