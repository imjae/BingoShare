# 배포

빌드 결과(`dist/`)는 순수 정적 파일이다. `vite.config.ts`에서 `base: './'`로 두었기 때문에
**루트든 하위 경로든 어디에 올려도 그대로 동작한다.** 호스팅을 나중에 갈아타도 코드를 고칠 일이 없다.

---

## 선택지 1 — GitHub Pages (워크플로 준비됨)

`.github/workflows/deploy.yml`이 이미 들어 있다. `main`에 푸시하면 빌드 후 배포까지 자동으로 간다.

**처음 한 번만 해야 하는 일** (GitHub 계정이 필요해 사람이 직접 해야 한다):

1. GitHub에 저장소를 만든다. **Pages를 무료로 쓰려면 public이어야 한다.**
2. 로컬 저장소를 연결하고 푸시한다:
   ```
   git remote add origin https://github.com/<계정>/BingoShare.git
   git push -u origin main
   ```
3. 저장소 → **Settings → Pages → Build and deployment → Source**를 **GitHub Actions**로 바꾼다.
4. **Actions** 탭에서 워크플로가 도는 걸 확인한다. 끝나면 주소가 나온다:
   `https://<계정>.github.io/BingoShare/`

> 3번을 빼먹으면 워크플로가 배포 단계에서 실패한다. 가장 흔한 실수다.

---

## 선택지 2 — Cloudflare Pages

설정 파일이 필요 없다. 대시보드에서 저장소를 연결하고 아래만 넣으면 된다.

| 항목 | 값 |
|---|---|
| 빌드 명령 | `npm run build` |
| 출력 디렉터리 | `dist` |
| Node 버전 | `24` |

GitHub Pages보다 나은 점: **비공개 저장소도 무료로 배포된다.** 주소도 더 짧다.

---

## 로컬에서 확인

```
npm install
npm run dev              # 개발 서버
npm run build            # 프로덕션 빌드 (타입 검사 포함)
npm run preview          # 빌드 결과를 그대로 띄워보기
```
