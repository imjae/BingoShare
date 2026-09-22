# CLAUDE.md

**AI 에이전트 진입점.** Claude Code가 파일명으로 자동 로드하는 자리라 이 이름을 바꿀 수 없다.
다른 도구는 `AGENTS.md`로 들어오고, 내용은 이 문서 하나를 가리킨다 — **규칙은 전부 여기 있다.**

## 이 프로젝트가 뭔가

커스텀 빙고판을 만들어 **링크 하나로 공유**하는 웹앱. **서버가 없다** — 판 설정이 링크 주소의
해시(`#b=…`) 안에 압축돼 통째로 들어간다.

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
npm run build     # tsc -b + vite build — 기본 컴파일 게이트
npm run lint      # oxlint. 경고도 남기지 않는다
```

**둘 다 통과시킨 뒤에 커밋한다.** CI가 같은 두 명령을 돌리므로, 여기서 깨지면 배포도 깨진다.

화면 동작은 개발 서버를 띄우고 **실제로 눌러서** 확인한다. 빌드 통과만으로 끝내지 않는다.

## 구조

| 파일 | 맡은 일 |
|---|---|
| `src/types.ts` | `Board`, `GameMode`, 상수. 판의 모양을 정하는 단일 소스 |
| `src/lib/encode.ts` | 판 ↔ 링크 주소. 압축·복원, 판 id 계산 |
| `src/lib/board.ts` | 자리 계산, 시드 섞기, 빙고 판정, 승리 판정 |
| `src/lib/storage.ts` | **진행 상황·이름·각자 문항의 유일한 통로.** M2에서 여기만 갈아끼운다 |
| `src/lib/route.ts` | 주소 해시로 화면 가르기 |
| `src/lib/samples.ts` | 예시 문항 |
| `src/screens/CreateScreen.tsx` | 만들기 (설정 단계 → 판 채우기 단계) |
| `src/screens/ShareScreen.tsx` | 공유 |
| `src/screens/PlayScreen.tsx` | 참가 → (각자 판이면 문항 채우기) → 진행 |
| `src/components/BoardEditor.tsx` | 빈 판에서 칸을 눌러 채우는 입력 화면 |
| `src/components/BingoGrid.tsx` | 진행용 빙고 격자 |
| `src/components/Layout.tsx` | 화면 껍데기, 버튼, 안내 상자 |

## 지켜야 할 계약

### 1. 판은 만든 뒤 바뀌지 않는다

`Board`를 고치면 `boardIdOf`가 달라지고, 그건 **다른 판**이다. 진행 상황이 판 id로 묶여 있어서
판을 고치면 이미 체크한 칸이 엉뚱한 내용에 붙는다. 설정을 바꾸려면 새 판을 만든다.

### 2. 배치는 재현돼야 한다

섞기 시드를 **판 id + 참가자 이름**에서 뽑는다. 새로고침해도, 며칠 뒤에 열어도 같은 자리여야 한다.
시드에 시간·난수·세션값을 섞지 않는다.

### 3. 링크 형식은 자리로만 늘린다

`encode.ts`의 `PackedBoard`는 배열이고 **뒤에 덧붙이는 것만 허용**한다. 중간 자리의 뜻을 바꾸면
이미 보낸 링크가 깨진다. 새 항목은 끝에 추가하고, `unpack`에서 없을 때의 기본값을 정한다.
버전 번호를 올리되 **옛 버전도 계속 읽을 수 있게** 둔다.

### 4. 진행 상황은 `storage.ts`로만 드나든다

화면 코드가 `localStorage`를 직접 만지지 않는다. M2에서 현황판을 붙일 때 이 파일 하나만
갈아끼우면 되도록 유지한다.

### 5. 저장소 접근은 언제나 실패할 수 있다

사생활 보호 모드나 저장 차단 설정에서 `localStorage`는 통째로 막힌다. 읽기·쓰기를 전부
try/catch로 감싸고, 실패해도 앱이 멈추지 않게 한다.

### 6. 링크 길이 2000자

메신저에서 잘리지 않는 선이다. 판에 담는 것을 늘릴 때는 `MAX_URL_LENGTH` 경고가 여전히
맞는지 확인한다.

## 함정 (겪은 것만)

### React — 링크가 바뀌면 화면도 새로 만들어야 한다

`PlayScreen`에서 해시만 바뀌면 React가 같은 화면을 재사용해서 **앞 판의 참가자 이름과 문항이
남았다.** 공유판에서 각자 판으로 넘어갈 때 남의 문항이 보일 수 있었다.
`<PlayBoard key={payload}>`로 고쳤다. 판·참가자 단위로 상태를 갈아야 하는 곳에는 `key`를 준다.

### 개발 서버가 좀비로 남는다

`TaskStop`으로 background 작업을 죽여도 **vite의 node 프로세스가 살아남아 포트를 계속 문다.**
다음 실행이 `Port is already in use`로 죽고, 브라우저는 옛 코드를 그대로 보여준다 —
고친 줄 알고 옛 화면을 검증하게 되므로 위험하다. 끝낸 뒤 포트를 확인해 정리한다:

```powershell
Get-NetTCPConnection -LocalPort 5177 -State Listen | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force }
```

### Bash 도구는 역슬래시를 한 번 벗긴다

명령 문자열 안의 `\n`이 진짜 줄바꿈이 되어 버린다. curl 설정을 `printf`로 만들 때 이것 때문에
따옴표가 줄을 넘어가 파싱이 깨졌다. 리터럴 역슬래시가 필요하면 한 단계 더 이스케이프하거나,
아예 그 문자를 피하는 형태로 바꾼다. 긴 파일은 Write 도구로 쓰는 게 안전하다.

### 이 환경의 curl은 POSIX 경로를 모른다

mingw curl이라 `-K /tmp/foo.cfg`가 실패한다. 설정은 **stdin으로** 넘긴다 (`| curl -K -`).
파일 경로를 줘야 하면 `cygpath -m`으로 바꾼다.

### 브라우저 창 캡처가 자주 시간 초과된다

앱 창이 뒤에 있으면 스크린샷이 5초 만료로 실패한다. 화면 확인은 `get_page_text`,
`read_page`, `javascript_tool`로 하고 스크린샷은 최종 눈 확인에만 쓴다.
`computer` 클릭은 좌표가 어긋날 때가 있어 `javascript_tool`로 요소를 직접 누르는 편이 확실하다.

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
