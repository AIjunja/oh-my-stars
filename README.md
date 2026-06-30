# Neon Star Sign Selfie

모바일 우선 React MVP입니다. 사용자가 화면 위에 바로 네온 싸인을 그리고, `REC 시작` 또는 `셀카 찍기`를 누르면 브라우저가 자동으로 카메라 권한을 요청합니다. 저장되는 사진과 영상에는 카메라 프레임과 사용자가 직접 그린 네온 싸인만 합성됩니다.

## 기능

- `getUserMedia`로 카메라 권한 요청 및 라이브 미리보기 표시
- `REC 시작` 또는 `셀카 찍기` 버튼에서 카메라 자동 시작
- 터치/마우스로 카메라 화면 위에 항상 바로 그릴 수 있는 네온 싸인 캔버스
- 별 모양 캐릭터/이모티콘 없이 저장:
  - 카메라 프레임
  - 사용자가 직접 그린 네온 싸인
- `MediaRecorder` + `canvas.captureStream()` 기반 녹화 기능
  - 최대 3분 녹화
  - 녹화 중 셀카 PNG 저장 가능
  - 녹화 중 전면/후면 카메라 전환 시도 가능
- 확대 크롭을 줄이기 위한 `object-fit: contain` 카메라 프리뷰
- 한국어/영어 UI 토글
- Moneygraphy Rounded 웹폰트 적용

## 실행 방법

```bash
npm install
npm run dev
```

터미널에 출력되는 로컬 주소를 브라우저에서 열어 주세요. 보통 아래 주소입니다.

```text
http://localhost:5173
```

## 사용 방법

1. 앱을 열면 화면 위에 바로 싸인을 그릴 수 있습니다.
2. 녹화가 필요하면 `REC 시작`을 누릅니다. 카메라 권한이 없으면 이때 권한 요청이 뜹니다.
3. 사진만 필요하면 `셀카 찍기`를 누릅니다. 카메라 권한이 없으면 이때 권한 요청이 뜨고, 준비되면 PNG가 저장됩니다.
4. `후면 전환` 또는 `전면 전환` 버튼으로 카메라를 바꿀 수 있습니다.
5. 녹화 중에도 카메라 전환과 `셀카 찍기`를 사용할 수 있습니다.
6. 녹화를 끝내려면 `REC 중지`를 누릅니다.
7. 녹화가 끝나면 `녹화 저장` 버튼으로 WebM 또는 MP4 파일을 다운로드합니다.
8. `다시 찍기`를 누르면 그려둔 싸인을 초기화합니다.

## 녹화 및 카메라 전환 참고

녹화는 브라우저의 `MediaRecorder`와 `canvas.captureStream()` 지원에 의존합니다. 최신 Chrome/Edge에서는 WebM 저장이 잘 동작합니다. 일부 iOS/Safari 환경에서는 브라우저 버전에 따라 녹화 저장이 제한될 수 있으며, 이 경우 앱에서 지원 불가 메시지를 표시합니다.

전면/후면 전환은 브라우저와 기기의 카메라 전환 정책을 따릅니다. 앱은 녹화 중에도 새 카메라 스트림으로 교체를 시도하며, 실패하면 기존 카메라를 유지하고 안내 메시지를 표시합니다.

## 카메라 권한 참고

브라우저 카메라는 보안 컨텍스트에서만 동작합니다. `localhost`는 허용되므로 로컬 개발 서버에서는 바로 사용할 수 있습니다. 외부 기기에서 개발 서버 주소로 접속하는 경우 브라우저 정책상 HTTPS가 필요할 수 있습니다.

## 개발 명령어

```bash
npm run build
npm run lint
```

## Cloudflare Pages 배포 설정

Cloudflare Pages에서 GitHub 저장소를 연결해 배포할 때는 아래처럼 설정합니다.

```text
Framework preset: React (Vite) 또는 Vite
Build command: npm run build
Build output directory: dist
Root directory: /
Node.js version: 22.12.0 이상
```

이 저장소에는 Pages가 출력 폴더를 찾을 수 있도록 `wrangler.jsonc`의 `pages_build_output_dir`를 `./dist`로 지정해 두었습니다.

Direct Upload로 배포할 때는 프로젝트 루트가 아니라 아래 명령으로 생성되는 `dist` 폴더 안의 파일들을 올려야 합니다.

```bash
npm run build
```

현재 Cloudflare Pages가 빌드 명령 없이 `wrangler.jsonc`의 `pages_build_output_dir`만 읽는 경우를 대비해, 이 저장소는 빌드된 `dist` 폴더도 함께 커밋합니다. Cloudflare 대시보드에서 빌드 명령이 비어 있는 상태라면 최신 커밋의 `dist`가 그대로 배포됩니다.

## 폰트

이 앱은 Moneygraphy Rounded 웹폰트를 CDN으로 불러옵니다. 폰트 파일을 저장소에 재배포하지 않고 CSS `@font-face`에서 외부 웹폰트 URL을 참조합니다.

## 안전한 에셋 사용

이 MVP는 실제 연예인 이름, 얼굴, 사진, 저작권 캐릭터를 사용하지 않습니다. 저장되는 사진과 영상에는 외부 이미지 에셋이나 별 캐릭터가 합성되지 않습니다.
