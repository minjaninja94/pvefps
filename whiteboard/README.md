# Whiteboard — Excalidraw 개인 작업 공간

GitHub Pages에서 제공하는 개인용 Excalidraw 작업 공간입니다.

- 앱 별도 회원가입/로그인 없음
- 브라우저 IndexedDB에 자동 임시 저장
- .excalidraw 파일 가져오기/내보내기
- Cloudflare Worker를 연결하면 GitHub 저장소 whiteboard/drawings/에 자동 동기화
- GitHub 토큰은 Cloudflare Worker Secret에만 저장하며 브라우저 코드에 포함하지 않음
- Excalidraw 0.18.0을 버전 고정해 ESM CDN에서 불러옴

## 주소

GitHub Pages 기본 주소 기준:

https://minjaninja94.github.io/pvefps/whiteboard/

GitHub Pages 설정에서 배포 소스가 main 브랜치의 루트가 아니라면 해당 설정에 맞는 경로를 확인하세요.

## 1. 먼저 로컬 자동 저장 사용

페이지에 접속하면 바로 새 드로잉을 사용할 수 있습니다. 저장은 현재 브라우저의 IndexedDB에 자동으로 이뤄집니다. 이 상태에서는 GitHub 연결이 필요하지 않습니다.

다만 로컬 저장은 현재 브라우저/기기에만 존재합니다. 브라우저 데이터 삭제나 다른 기기 사용에 대비해 중요한 그림은 .excalidraw 파일로 내보내거나 GitHub 동기화를 설정하세요.

## 2. GitHub 자동 저장 설정 (최초 1회)

정적 GitHub Pages 사이트만으로는 GitHub 저장소에 파일을 쓸 수 없습니다. 브라우저에 GitHub PAT를 넣는 방식은 사용하지 않습니다. 대신 별도 Cloudflare Worker가 GitHub API를 대리 호출합니다.

앱 자체에는 계정 로그인 화면이 없습니다. 아래 설정은 한 번만 진행하면 됩니다.

### 2-1. GitHub Fine-grained Personal Access Token 만들기

GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens에서 새 토큰을 만듭니다.

- Repository access: Only select repositories
- 선택 저장소: minjaninja94/pvefps
- Repository permissions: Contents → Read and write
- 그 외 권한은 추가하지 마세요.

토큰은 생성 직후 복사합니다. 이 토큰을 웹 앱의 설정 칸에 입력하지 마세요.

### 2-2. Cloudflare Worker 배포

Node.js가 설치된 PC에서 저장소를 내려받은 뒤 아래 디렉터리로 이동합니다.

~~~powershell
cd whiteboard-worker
npx wrangler@latest login
npx wrangler@latest secret put GITHUB_TOKEN
~~~

명령이 입력을 기다리면 2-1에서 만든 GitHub 토큰을 붙여넣습니다.

동기화 키를 생성합니다. PowerShell에서 다음 명령을 실행합니다.

~~~powershell
$bytes = New-Object byte[] 32
$rng = [Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($bytes)
$syncKey = -join ($bytes | ForEach-Object { $_.ToString("x2") })
$rng.Dispose()
$syncKey
~~~

출력된 키를 복사한 다음 Worker Secret으로 등록합니다.

~~~powershell
npx wrangler@latest secret put SYNC_KEY
~~~

명령이 입력을 기다리면 방금 생성한 키를 붙여넣습니다. 이 키는 웹 앱의 저장 요청을 허용하는 별도 비밀키이며 GitHub 토큰과 다릅니다.

Worker를 배포합니다.

~~~powershell
npx wrangler@latest deploy
~~~

배포 결과에 표시되는 https://pvefps-whiteboard-sync.<계정>.workers.dev 주소를 복사합니다.

wrangler.toml에는 저장소, 브랜치, 저장 폴더 및 허용 Origin이 이미 지정되어 있습니다. 허용 Origin은 https://minjaninja94.github.io 입니다. 다른 도메인이나 Pages 커스텀 도메인을 쓰면 ALLOWED_ORIGIN 값을 해당 Origin으로 바꾼 뒤 다시 배포해야 합니다.

### 2-3. 앱에 연결

1. https://minjaninja94.github.io/pvefps/whiteboard/ 접속
2. 왼쪽 아래 설정 선택
3. Cloudflare Worker 주소 입력
4. 2-2에서 생성한 SYNC_KEY 입력
5. 연결 저장 선택

이후 드로잉을 수정하면 로컬 저장 후 변경이 잠시 멈춘 시점에 GitHub로 자동 저장됩니다. GitHub 저장 버튼으로 즉시 저장할 수도 있습니다.

동기화 키는 해당 브라우저의 localStorage에 저장됩니다. 공용 PC에서는 연결하지 마세요. 키가 유출되었다면 Cloudflare Worker의 SYNC_KEY를 새 값으로 교체하고 앱 설정도 갱신하세요.

## 저장 구조와 버전 이력

- 로컬 임시 저장: 브라우저 IndexedDB
- GitHub 원본: whiteboard/drawings/<파일명>.excalidraw
- GitHub 동기화는 GitHub Contents API를 사용하며 저장할 때마다 커밋이 생성됩니다.
- 이전 버전은 GitHub 저장소의 해당 파일 → History에서 확인/복구할 수 있습니다.
- 로컬 전용 드로잉도 .excalidraw로 내보내 다른 기기에 옮길 수 있습니다.
- 이름 변경은 새 파일을 저장한 뒤 이전 파일을 삭제합니다. Git 커밋 이력에는 이전 파일의 삭제 전 기록이 남습니다.

## 보안 및 제한

- GitHub PAT는 Worker의 GITHUB_TOKEN Secret에만 보관됩니다. 브라우저 HTML/JavaScript에 포함되지 않습니다.
- Worker는 지정된 GitHub Pages Origin과 SYNC_KEY가 모두 일치해야 쓰기 요청을 처리합니다. CORS Origin 검사는 브라우저 제약이지 단독 인증 수단은 아니며, 실제 쓰기 권한은 SYNC_KEY로 보호됩니다.
- SYNC_KEY는 브라우저에 저장되는 bearer key입니다. XSS 또는 브라우저 프로필 탈취에 취약할 수 있으므로 개인 기기에서만 사용하세요.
- GitHub PAT는 pvefps 저장소 하나에만 Contents: Read and write 권한으로 발급하세요. 토큰은 만료 기간을 설정하고 필요할 때 회수/재발급하세요.
- GitHub Contents API의 안전한 파일 크기 한도에 맞춰 동기화 파일은 900 KB로 제한합니다. 이미지가 큰 작업은 로컬 IndexedDB에 보관하고 .excalidraw 파일로 내보내세요.
- GitHub 동기화에는 인터넷 연결이 필요합니다. 연결 실패 시 로컬 저장은 계속되며 상태 표시가 동기화 대기 상태로 바뀝니다.
- Excalidraw 엔진, CSS 및 글꼴은 esm.sh CDN에서 가져옵니다. 첫 로딩에는 인터넷 연결이 필요합니다.
- 브라우저 IndexedDB 데이터는 브라우저/기기 간 자동 공유되지 않습니다.
- 이 Worker는 개인 저장소 전용으로 설계했습니다. 여러 사용자가 함께 쓰는 공개 서비스로 전환하려면 사용자별 인증, 접근 제어, 요청 제한을 추가해야 합니다.

## 로컬 테스트

정적 페이지는 저장소 루트에서 간단한 HTTP 서버로 확인할 수 있습니다.

~~~powershell
python -m http.server 8080
~~~

그다음 http://localhost:8080/whiteboard/로 접속합니다. 로컬 Origin은 Worker의 허용 Origin과 다르므로 GitHub 동기화는 기본적으로 차단됩니다. 로컬에서 동기화를 시험하려면 Worker의 ALLOWED_ORIGIN을 임시 로컬 Origin으로 바꾸고 재배포한 뒤 테스트가 끝나면 원래 Pages Origin으로 되돌리세요.

## 참고

- Excalidraw React integration: https://github.com/excalidraw/excalidraw
- Excalidraw package: https://www.npmjs.com/package/@excalidraw/excalidraw
- GitHub Contents API: https://docs.github.com/en/rest/repos/contents
- Cloudflare Workers secrets: https://developers.cloudflare.com/workers/configuration/secrets/
