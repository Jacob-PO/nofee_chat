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
