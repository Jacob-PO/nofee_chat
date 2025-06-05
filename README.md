# Nofee Chat

이 저장소는 Webflow에서 동작하는 노피 AI 챗봇 스크립트와 데이터를 제공합니다.

## 파일 구조
- `main.html` – Webflow에 그대로 임베드할 수 있는 완전한 챗봇 코드
- `main.js` – 챗봇 동작 스크립트(자동 로드)
- `item.json` – 스마트폰 상품 데이터
- `regions.json` – 지역 데이터

## 사용 방법
1. `main.html` 파일의 전체 코드를 Webflow의 **Code Embed** 요소에 붙여넣습니다. 이 파일은 `main.js`를 GitHub에서 자동으로 로드하므로 추가 업로드가 필요하지 않습니다.
2. `item.json`과 `regions.json` 파일은 GitHub/jsDelivr 등에 업로드한 뒤 `window.NOFEE_BASE_URL` 값을 변경해 불러올 수 있습니다.
3. Webflow에 `Chat Form`이라는 이름의 폼을 생성하고 필요한 필드를 hidden input으로 추가합니다.
4. 사이트를 퍼블리시한 후 챗봇이 정상적으로 동작하는지 확인합니다.

