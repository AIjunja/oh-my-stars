# Neon Star Sign Selfie

모바일 우선 React MVP입니다. 사용자가 셀피 카메라를 켜고, 가상 스타 캐릭터와 네온 싸인을 카메라 위에 합성한 뒤 PNG로 저장할 수 있습니다.

## 기능

- `getUserMedia`로 전면 카메라 권한 요청 및 라이브 미리보기 표시
- CSS/SVG로 만든 저작권 안전한 가상 스타 캐릭터 오버레이
- SVG path `stroke-dashoffset` 기반 네온 싸인 애니메이션
- Canvas 합성 저장:
  - 라이브 카메라 프레임
  - 가상 스타 캐릭터
  - 네온 싸인
- 버튼 4개 제공:
  - `카메라 시작`
  - `싸인 받기`
  - `사진 저장`
  - `다시 찍기`

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

1. 앱을 열고 `카메라 시작`을 누릅니다.
2. 브라우저의 카메라 권한 요청을 허용합니다.
3. 라이브 셀피 미리보기 위에 가상 스타 캐릭터가 표시됩니다.
4. `싸인 받기`를 누르면 네온 싸인이 카메라 위에 애니메이션으로 그려집니다.
5. `사진 저장`을 누르면 현재 카메라 프레임, 캐릭터, 싸인이 합성된 PNG가 다운로드됩니다.
6. `다시 찍기`를 누르면 싸인 상태를 초기화하고 다시 촬영할 수 있습니다.

## 카메라 권한 참고

브라우저 카메라는 보안 컨텍스트에서만 동작합니다. `localhost`는 허용되므로 로컬 개발 서버에서는 바로 사용할 수 있습니다. 휴대폰에서 다른 기기의 개발 서버 주소로 접속할 경우 브라우저 정책상 HTTPS가 필요할 수 있습니다.

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

이 저장소에는 Pages가 출력 폴더를 알 수 있도록 `wrangler.jsonc`의 `pages_build_output_dir`을 `./dist`로 지정해 두었습니다.

Direct Upload로 배포할 때는 프로젝트 루트가 아니라 아래 명령으로 생성되는 `dist` 폴더 안의 파일들을 올려야 합니다.

```bash
npm run build
```

현재 Cloudflare Pages가 빌드 명령 없이 `wrangler.jsonc`의 `pages_build_output_dir`만 읽는 경우를 대비해, 이 저장소는 빌드된 `dist` 폴더도 함께 커밋합니다. Cloudflare 대시보드에서 빌드 명령을 비워둔 상태라면 최신 커밋의 `dist`가 그대로 배포됩니다.

## 안전한 에셋 사용

이 MVP는 실제 연예인 이름, 얼굴, 사진, 저작권 캐릭터를 사용하지 않습니다. 화면의 스타는 단순 SVG/CSS로 만든 가상의 별 캐릭터입니다.
