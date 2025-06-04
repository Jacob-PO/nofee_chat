# Nofee Chat

이 저장소는 Webflow에서 동작하는 노피 AI 챗봇 스크립트와 데이터를 제공합니다.

## 파일 구조
- `main.js` – 챗봇 동작을 담당하는 JavaScript 파일
- `item.json` – 스마트폰 상품 데이터
- `regions.json` – 지역 데이터

## 사용 방법
1. GitHub Pages 또는 jsDelivr CDN을 통해 이 저장소의 파일을 호스팅합니다.
2. Webflow 페이지의 Custom Code 영역에서 다음 스크립트를 사용하여 `main.js`를 로드합니다.

```html
<script src="https://cdn.jsdelivr.net/gh/Jacob-PO/nofee_chat@main/main.js"></script>
```

3. Webflow에 `Chat Form`이라는 이름의 폼을 생성하고 필요한 필드를 hidden input으로 추가합니다.
4. 사이트를 퍼블리시한 후 챗봇이 정상적으로 동작하는지 확인합니다.

## 오프라인 실행 방법

네트워크 접속이 어려운 환경에서도 챗봇 스크립트를 테스트할 수 있도록 `offline.html`과 `run.js` 스크립트를 제공합니다.

1. 의존성 설치:
   ```bash
   npm install jsdom
   ```
2. Node.js 환경에서 데이터 로드 확인:
   ```bash
   node run.js
   ```
   실행하면 로컬 `item.json`과 `regions.json`을 불러와 데이터 개수를 출력합니다.
3. 브라우저에서 직접 확인하려면 `offline.html`을 로컬 서버에서 열면 됩니다.
   ```bash
   python3 -m http.server
   ```
   이후 `http://localhost:8000/offline.html`에 접속하면 챗봇이 로드됩니다.

`window.NOFEE_BASE_URL` 변수를 사용하면 데이터 파일의 위치를 변경할 수 있습니다. 기본값은 jsDelivr CDN이지만 오프라인 테스트 시에는 `./`로 설정하여 로컬 파일을 사용합니다.
