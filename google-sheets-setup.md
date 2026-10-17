# Google Sheets 저장 연동 — 보안 전환 가이드

**상태: GitHub PR 코드 검토 단계. Google Apps Script 실서비스에는 아직 적용하지 않았습니다.**

Caffeine Atlas가 저장하는 유전자형과 전체 리포트는 민감정보가 포함될 수 있습니다. 공개 GitHub Pages 화면의 로그인 버튼, consent=true 값, 단순 요청 ID는 사용자 인증 수단이 아닙니다.

## 기존 공개 엔드포인트 문제

- 브라우저 JavaScript에 Google Apps Script /exec 주소가 포함돼 있어 독립 호출이 가능합니다.
- doPost는 요청자가 실제 로그인했는지 확인하지 않고 저장합니다.
- setupTemplate 관리 명령은 웹 POST로 실행 가능해 요약 테이블을 초기화할 수 있었습니다.
- doGet에는 스프레드시트 식별자가 응답에 포함됐습니다.

이번 변경은 doPost/doGet에 HMAC 서명을 필수로 요구하고, 잘못된 서명/만료/재사용 nonce/비밀키 누락 시 요청을 거부합니다. setupTemplate 웹 호출은 서명 여부와 무관하게 금지합니다. 원래 단건·일괄 저장 및 중복 검사는 유지합니다. 운영 배포는 하지 않았습니다.

## 운영 설정 (Script Properties)

Apps Script 프로젝트 설정 → 스크립트 속성:

- CAFFEINE_ATLAS_SHEET_ID: 실제 운영 시트 식별자. GitHub 코드에 하드코딩하지 않습니다.
- CAFFEINE_ATLAS_WRITE_HMAC_KEY: 32자 이상의 충분히 강한 난수 비밀키. 승인된 서버만 동일 값을 보유합니다.

비밀키·API 토큰·실제 환자정보는 GitHub 또는 웹 브라우저 코드에 넣지 마세요.

## 서버 서명 규격

POST 요청 본문은 payload 객체와 auth 객체를 포함합니다. auth에는 timestamp(Unix 초), nonce(32자리 소문자 hex), signature(64자리 소문자 hex)가 있습니다. HMAC-SHA256 키는 Script Properties에만 둡니다.

서명 대상: timestamp + "." + nonce + "." + JSON.stringify(payload)
서명 허용 시계 차이: ±300초. nonce는 Script Cache에서 600초간 중복 사용을 거절합니다. Cache의 TTL 및 저장 특성상 영구적인 트랜잭션 재사용 방지로 간주하지 마세요.

GET 상태 확인 및 기능 확인의 서명 대상 payload는 JSON.stringify("GET:" + action + ":" + requestId) 입니다. action은 capabilities 또는 saveStatus만 허용합니다. GET도 새 서명이 필요하며 스프레드시트 식별자는 반환하지 않습니다.

## 실제 로그인 시스템과 연결해야 하는 이유

현재 공개 Caffeine Atlas app.js는 Apps Script URL에 직접 POST하고 JSONP로 확인합니다. 서명 비밀키를 이용자 브라우저에 삽입하는 것은 금지입니다. 다음 작업은 Cloudflare Access로 사용자 로그인을 검증한 Worker에서만 Apps Script 요청을 서명하도록 프록시를 구현하는 것입니다.

이 프록시가 완성되기 전에 Apps Script만 새로운 코드로 배포하면 기존 저장 기능은 작동하지 않습니다. 반대로 공개된 구버전 /exec 웹앱을 남겨두면 로그인 우회가 가능합니다.

안전한 전환 순서:
1. 실제 배포된 Google Apps Script 접근권한과 데이터 접근자, 보존/삭제 절차 확인
2. Access JWT로 사용자 인증과 권한을 확인하는 서버 측 저장 프록시 구현
3. 승인된 가상 데이터만으로 단건·일괄·중복·저장 확인 시나리오 테스트
4. Apps Script 프로젝트 Script Properties 설정, 새 코드 반영, 새 버전 배포
5. 옛 공개 /exec URL 우회 제거 및 인증된 프록시 전용 전환
6. 사용자별 동의 증빙·보관기간·삭제 기능 및 비공개 문의 경로 확정

**중요:** 회원 로그인 화면이 있어도 Google Sheets API는 별도 권한 검증이 필요합니다. Cloudflare 설정·운영 배포·실제 저장 데이터·개인정보 법률 검증은 이번 코드 PR의 범위에 포함되지 않습니다.

## 테스트

- node --test tests/google-apps-script-batch.test.cjs
- node --test tests/apps-script-auth.test.cjs
- node --test tests/*.test.cjs

모든 테스트는 로컬 가상 Google 객체를 이용하며 실제 스프레드시트를 조회·수정하지 않습니다.
