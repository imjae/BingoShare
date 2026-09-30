# CLAUDE.md

**AI 에이전트 진입점.** Claude Code가 파일명으로 자동 로드하는 자리라 이 이름을 바꿀 수 없다.
다른 도구는 `AGENTS.md`로 들어오고, 내용은 이 문서 하나를 가리킨다 — **규칙은 전부 여기 있다.**

## 이 프로젝트가 뭔가

빙고판 설정(제목·크기·승리 줄 수)을 **링크 하나로 보내면**, 받은 사람이 각자 자기 판을 채워서
노는 웹앱. **서버가 없다** — 설정은 링크 주소의 해시(`#b=…`)에, 내 판은 브라우저 저장소에 있다.
서비스 워커로 **한 번 연 뒤에는 오프라인에서도** 열고, 고치고, 체크한다.

- 배포: https://imjae.github.io/BingoShare/ (GitHub Pages, `main` 푸시 시 자동)
- 저장소: https://github.com/imjae/BingoShare (공개)
- 설계와 결정 기록: [Docs/PLAN.md](Docs/PLAN.md)
- 작업 기록: [Docs/WORKLOG.md](Docs/WORKLOG.md)
- 배포 절차: [Docs/DEPLOY.md](Docs/DEPLOY.md)

## 출력 언어

**작업 완료 시 마무리 정리는 한글로 쓴다.** 무엇을 어떻게 만들었고 어디에 뒀는지, 검증 결과와
남은 한계까지 한글로 정리한다. 코드·주석·커밋 메시지도 이 저장소는 한글 주석을 쓴다.

## 검증

```
npm test          # vitest. 판정·링크 호환·저장 규칙을 지킨다
npm run lint      # oxlint. 경고도 남기지 않는다
npm run build     # tsc -b + vite build — 기본 컴파일 게이트. dist/sw.js도 여기서 생긴다
```

**셋 다 통과시킨 뒤에 커밋한다.** CI가 같은 세 명령을 돌리므로, 여기서 깨지면 배포도 깨진다.

테스트가 잠그는 것:

| 파일 | 잠그는 것 |
|---|---|
| `board.test.ts` | 빙고·승리 판정, 다 채웠는지, 붙여넣기 해석 |
| `encode.test.ts` | **옛 링크가 계속 열리는지**(옛 커밋이 실제로 만든 문자열로), 새 링크 형식의 자리, 링크 구분 |
| `storage.test.ts` | 저장·불러오기, 망가진 데이터 정규화, **저장이 막힌 브라우저에서 멈추지 않는지** |
| `fit.test.ts` | 칸에 들어가는 가장 큰 글자 크기 찾기 — 경계값, 측정 횟수(칸 25개를 매번 재므로) |

이 규칙을 바꿀 생각이면 **테스트를 먼저 고치고** 왜 바뀌어야 하는지를 남긴다.

화면 동작은 서버를 띄우고 **실제로 눌러서** 확인한다. 빌드 통과만으로 끝내지 않는다.

### 오프라인 확인 — 서버를 진짜로 꺼 본다

서비스 워커는 **빌드본에서만** 켜진다(`src/lib/offline.ts`). 개발 서버로는 확인할 수 없다.

1. `npm run build` 후 `bingoshare-preview`를 띄운다 (`.claude/launch.json`, GitHub Pages와 같은
   `/BingoShare/` 하위 경로, 포트 4173)
2. `http://localhost:4173/BingoShare/`를 열고 판을 만들어 둔다
3. 서버를 끄고 **포트가 진짜 닫혔는지 확인한다** (아래 "좀비" 함정 참고). 캐시에 없는 주소로
   `fetch`해서 실패하는지도 본다 — 성공하면 오프라인이 아니다
4. 새로고침해서 판이 뜨는지, 체크·수정이 되는지, 다시 새로고침해도 남는지 본다

**온라인에서만 확인하면 오프라인 버그는 절대 안 보인다.** 캐시에서 못 찾아도 네트워크가 받아 주기 때문이다.
실제로 이 방식으로만 잡힌 버그가 있다 (아래 `Vary: Origin` 함정).

## 구조

| 파일 | 맡은 일 |
|---|---|
| `src/types.ts` | `Board`(링크에 담는 설정), `MyBoard`(내 판). 모양을 정하는 단일 소스 |
| `src/lib/encode.ts` | 판 ↔ 링크 주소. 압축·복원, 판 id, 링크 구분용 임의 값 |
| `src/lib/board.ts` | 빙고 판정, 승리 판정, 붙여넣기 해석 |
| `src/lib/storage.ts` | **내 판(이름·문항·체크)의 유일한 통로.** 저장된 판 목록도 여기서 |
| `src/lib/offline.ts` | 서비스 워커 등록 (빌드본에서만) |
| `src/lib/fit.ts` | 글자 크기 이분 탐색. DOM 없이 테스트하려고 `CellText`에서 떼어 냈다 |
| `src/lib/route.ts` | 주소 해시로 화면 가르기 |
| `src/lib/samples.ts` | 예시 문항 |
| `src/screens/CreateScreen.tsx` | 처음 화면. 이 기기에 저장된 판 목록 + 초대 링크 만들기 |
| `src/screens/ShareScreen.tsx` | 초대 링크 복사 |
| `src/screens/PlayScreen.tsx` | 이름 → 판 채우기 → 진행. 진행 중 문항 고치기·이름 바꾸기 |
| `src/components/BoardEditor.tsx` | 빈 판에서 칸을 눌러 채우는 입력 화면 |
| `src/components/BingoGrid.tsx` | 진행용 빙고 격자. 짧게 누르면 체크, **길게 누르면 전체 문항** |
| `src/components/CellText.tsx` | 칸 글자를 **절대 넘치지 않게** 맞춘다 (줄이기 → 단어 중간 줄바꿈 → `…`) |
| `src/components/Layout.tsx` | 화면 껍데기, 버튼, 안내 상자 |
| `sw/service-worker.js` | 서비스 워커 본체. 빌드가 파일 목록을 붙여 `dist/sw.js`로 낸다 |
| `vite.config.ts` | `offlineCache` 플러그인 — 빌드 끝에 dist를 훑어 `sw.js`를 만든다 |

## 지켜야 할 계약

### 1. 링크는 바뀌지 않는다. 내 판은 언제든 고친다

링크에 담긴 설정(`Board`)을 고치면 `boardIdOf`가 달라지고, 그건 **다른 판**이다. 저장된 내 판이
판 id로 묶여 있어서 다시 찾지 못한다. 설정을 바꾸려면 새 링크를 만든다.

반대로 **내 판(`MyBoard`)의 문항은 언제든 고친다.** 체크는 칸 **자리**에 붙어 있어서 문항을
고쳐도 그대로 남는다. 이건 의도다 — "잘못 적은 걸 고쳤다"가 가장 흔한 경우다.

### 2. 설정이 같아도 링크마다 다른 판이다

링크에 문항이 없으니 제목·크기·줄 수가 같으면 링크가 똑같아진다. 그러면 서로 다른 모임의 판이
한 기기에서 하나로 합쳐진다. 그래서 링크를 만들 때마다 **임의 값(`nonce`)을 붙인다.**
이걸 빼거나 고정값으로 두지 않는다.

### 3. 링크 형식은 자리로만 늘린다

`encode.ts`의 `PackedBoard`는 배열이고 **뒤에 덧붙이는 것만 허용**한다. 중간 자리의 뜻을 바꾸면
이미 보낸 링크가 깨진다. 새 항목은 끝에 추가하고, `unpack`에서 없을 때의 기본값을 정한다.
버전 번호를 올리되 **옛 버전도 계속 읽을 수 있게** 둔다.

간소화로 안 쓰게 된 자리(섞기·공짜 칸·문항·방식, 3~6번)도 **지우지 않고 고정값으로 채운다.**

### 4. 내 판은 `storage.ts`로만 드나든다

화면 코드가 `localStorage`를 직접 만지지 않는다. 저장 방식을 바꿀 일이 생기면 이 파일 하나만
갈아끼운다.

### 5. 저장소 접근은 언제나 실패할 수 있다

사생활 보호 모드나 저장 차단 설정에서 `localStorage`는 통째로 막힌다. 사파리는 `window.localStorage`를
**읽는 순간** 예외를 던지기도 한다. 읽기·쓰기를 전부 try/catch로 감싸고, 실패해도 앱이 멈추지 않게 한다.

저장이 이 앱의 핵심 약속이므로 **실패하면 조용히 넘어가지 않는다.** `saveMyBoard`가 `false`를 돌려주면
화면이 "창을 닫으면 판이 사라진다"고 알린다.

### 6. 오프라인에서 열려야 한다

- **외부로 나가는 요청을 만들지 않는다.** CDN 폰트·스크립트·이미지를 넣으면 오프라인에서 그것만 깨진다.
  필요한 건 전부 번들이나 `public/`에 넣는다 — 그러면 빌드가 캐시 목록에 자동으로 넣는다
- 캐시 목록을 손으로 적지 않는다. `offlineCache` 플러그인이 dist를 훑어서 만든다
- `imjae.github.io`는 **다른 저장소의 페이지와 저장소·캐시를 같이 쓴다.** localStorage 키는
  `bingoshare:`로, 캐시 이름은 `bingoshare-`로 시작해야 하고, 지울 때도 그 앞머리만 지운다

## 함정 (겪은 것만)

### 서비스 워커 — `Vary: Origin` 때문에 오프라인에서 JS·CSS를 못 찾았다

오프라인에서 새로고침하면 **화면이 하얗게** 떴다. `index.html`은 캐시에서 나왔는데 JS·CSS만 실패했다.
서버가 `Vary: Origin`을 붙이는데, 캐시에 받아 둘 때의 요청엔 `Origin`이 없고 페이지가 `crossorigin`
속성으로 부를 땐 브라우저가 `Origin`을 붙인다. `Vary`가 달라 **캐시에 있는데도 못 찾았다.**
`cache.match(request.url, { ignoreVary: true })`로 고쳤다. 온라인에서는 네트워크가 받아 줘서
전혀 드러나지 않았고, **서버를 실제로 꺼 보고서야** 잡혔다.

### 서비스 워커 — preview를 다시 띄우면 첫 화면은 옛 빌드다

브라우저에 서비스 워커가 남아 있으면 첫 로드는 **옛 캐시에서** 나온다. 새 빌드는 그 사이 뒤에서
설치되고, **한 번 더 새로고침해야** 보인다. 고친 줄 알고 옛 화면을 검증하게 되므로, 확인이 끝나면
서비스 워커를 해제하고 캐시를 지워 둔다 (`javascript_tool`로
`navigator.serviceWorker.getRegistrations()` → `unregister()`, `caches.delete()`).

배포에서도 같다. **새 버전은 한 번 연 뒤 다음에 열 때 뜬다.**

### React — 링크가 바뀌면 화면도 새로 만들어야 한다

`PlayScreen`에서 해시만 바뀌면 React가 같은 화면을 재사용해서 **앞 판의 참가자 이름과 문항이
남았다.** `<PlayBoard key={payload}>`로 고쳤다. 판 단위로 상태를 갈아야 하는 곳에는 `key`를 준다.

### 서버가 좀비로 남는다

`TaskStop`이나 `preview_stop`으로 죽여도 **vite의 node 프로세스가 살아남아 포트를 계속 물 수 있다.**
다음 실행이 `Port is already in use`로 죽고, 브라우저는 옛 코드를 그대로 보여준다.
**오프라인 확인에서는 더 위험하다** — 서버가 살아 있으면 "오프라인에서 된다"는 가짜 결과가 나온다.
끈 뒤에 포트를 확인해 정리한다 (개발 5173, preview 4173):

```powershell
Get-NetTCPConnection -LocalPort 4173 -State Listen | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force }
```

### Bash 도구는 역슬래시를 한 번 벗긴다

명령 문자열 안의 `\n`이 진짜 줄바꿈이 되어 버린다. curl 설정을 `printf`로 만들 때 이것 때문에
따옴표가 줄을 넘어가 파싱이 깨졌다. 리터럴 역슬래시가 필요하면 한 단계 더 이스케이프하거나,
아예 그 문자를 피하는 형태로 바꾼다. 긴 파일은 Write 도구로 쓰는 게 안전하다.

### 이 환경의 curl은 POSIX 경로를 모른다

mingw curl이라 `-K /tmp/foo.cfg`가 실패한다. 설정은 **stdin으로** 넘긴다 (`| curl -K -`).
파일 경로를 줘야 하면 `cygpath -m`으로 바꾼다.

### 브라우저 창 캡처가 자주 시간 초과된다

앱 창이 뒤에 있으면 스크린샷과 좌표 클릭이 5초 만료로 실패한다. 화면 확인은 `get_page_text`,
`read_page`, `javascript_tool`로 하고 스크린샷은 최종 눈 확인에만 쓴다.
버튼은 `javascript_tool`로 요소를 직접 누르고, React 입력칸은 `HTMLInputElement.prototype`의
`value` setter로 넣은 뒤 `input` 이벤트를 쏜다 — `value`만 바꾸면 React가 모른다.
칸 입력칸은 `<textarea>`라서 `HTMLTextAreaElement.prototype`의 setter를 써야 한다.
길게 누르기는 `PointerEvent('pointerdown')` → 600ms 기다림 → `pointerup`으로 흉내 낸다.
칸이 넘치는지는 스크린샷 대신 글자 상자와 칸 상자의 `getBoundingClientRect()`를 비교해 잰다.
새로고침하면 `window`에 붙여 둔 시험용 함수가 사라지니 다시 정의한다.

## 배포와 깃

- **`main`에 푸시하면 자동 배포된다.** 따로 할 일이 없다.
- 이 PC에는 `gh` CLI가 없다. GitHub API가 필요하면 git 자격 증명 관리자에 저장된
  `imjae` 계정 토큰을 쓴다 — **토큰 값을 화면에 출력하지 않는다.**
  ```
  TOKEN=$(printf 'protocol=https\nhost=github.com\n\n' | git credential fill | sed -n 's/^password=//p')
  printf 'header = "Authorization: Bearer %s"\nurl = "…"\nsilent\n' "$TOKEN" | curl -K -
  ```
- 커밋 메시지는 한글. 무엇을 왜 바꿨는지 쓰고, 고친 버그는 원인까지 한 줄 남긴다.
- **저장소가 공개다.** 올리는 것은 전부 인터넷에 보인다.
