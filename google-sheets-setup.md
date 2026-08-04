# Google Sheets 저장 연동 설정

리포트 결과를 아래 Google Sheet에 축적하려면 Google Apps Script 웹앱 URL이 필요합니다.

대상 시트:
`https://docs.google.com/spreadsheets/d/1v0-AhubC4vXzK-dzmA1G_S0qR8DYLOe1woqnAl7VL0s/edit`

Spreadsheet ID:
`1v0-AhubC4vXzK-dzmA1G_S0qR8DYLOe1woqnAl7VL0s`

## 1. Apps Script 열기

1. 위 Google Sheet를 엽니다.
2. `확장 프로그램 > Apps Script`를 엽니다.
3. `Code.gs` 파일에 아래 코드를 붙여넣습니다.

## 2. Apps Script 코드 붙여넣기

최신 전체 코드는 로컬 파일 `google-apps-script/Code.gs`에 저장되어 있습니다. 파일 내용을 Apps Script의 `Code.gs`에 전체 교체해 붙여넣습니다.

현재 코드는 다음 두 가지 저장 요청을 함께 처리합니다.

- 1명 직접 입력: 기존처럼 한 행을 저장합니다.
- 엑셀 일괄 업로드: `batchSave` 요청으로 최대 200명의 행을 한 번에 검증하고 `setValues`로 일괄 저장합니다.

엑셀 양식은 메인 홈페이지와 리포트 생성 화면의 `엑셀 양식 다운로드` 버튼에서 받을 수 있습니다. 양식의 2행은 `예시-저장안됨` Sample ID가 들어간 작성 예시이며, 웹사이트와 Apps Script 양쪽에서 자동 제외됩니다. 실제 대상자 정보는 3행부터 입력합니다.

일괄 저장에는 같은 업로드를 묶어 확인할 수 있는 `일괄 처리 ID` 열이 추가됩니다. 서버에서도 저장 동의, 필수값, 허용 유전자형, 점수 범위를 다시 검사합니다.

## 3. 웹앱 배포

1. 처음 연결하는 경우 Apps Script에서 `배포 > 새 배포`를 선택합니다.
2. 유형은 `웹 앱`으로 선택합니다.
3. 실행 계정은 `나`로 둡니다.
4. 액세스 권한은 사이트 공개 범위에 맞춰 설정합니다.
   - 외부 사용자가 리포트 결과를 저장해야 하면 `모든 사용자` 또는 배포 화면에서 허용 가능한 공개 옵션을 선택해야 합니다.
5. 배포 후 생성되는 웹앱 URL을 복사합니다.
6. 복사한 웹앱 URL을 브라우저 주소창에 열어봅니다.
   - 정상이라면 `ok: true`와 `Caffeine Atlas Google Sheets endpoint is active.` 문구가 보입니다.
   - Google Drive의 `현재 파일을 열 수 없습니다` 화면이 보이면 URL이 잘못됐거나 배포가 유효하지 않은 상태입니다.

이미 웹앱을 배포한 상태에서 일괄 업로드 기능을 추가하는 경우에는 코드를 붙여넣은 뒤 `배포 > 배포 관리 > 수정 > 새 버전`으로 다시 배포해야 합니다. 같은 배포를 수정하면 기존 `/exec` URL을 유지할 수 있습니다.

사이트는 일괄 저장 전에 웹앱의 `batchSave` 지원 여부를 먼저 확인합니다. 구버전 Apps Script가 배포되어 있거나 접근 권한이 맞지 않으면 데이터 전송을 중단하고 재배포 안내를 표시하므로, 화면에 버전 확인 오류가 나오면 먼저 이 단계를 확인합니다.

## 4. 사이트에 URL 넣기

`caffeine-sensitivity-app/app.js`의 아래 값을 복사한 웹앱 URL로 바꿉니다.

```javascript
var GOOGLE_SHEETS_ENDPOINT = "https://script.google.com/macros/s/배포ID/exec";
```

## 주의

유전자형과 리포트 결과는 민감한 정보로 취급해야 합니다. 실제 운영 전에는 저장 동의 문구, 보관 기간, 접근 권한, 삭제 요청 처리 절차를 정리해 두는 것이 좋습니다.

엑셀 업로드 화면은 파일을 먼저 브라우저 내부에서 분석합니다. 파일에 오류 행이 하나라도 있으면 정상 행만 부분 저장하지 않으며, 오류를 모두 수정한 뒤 다시 업로드해야 Google Sheets 저장 요청이 전송됩니다.
