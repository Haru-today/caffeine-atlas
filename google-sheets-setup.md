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

동일한 코드는 로컬 파일 `google-apps-script/Code.gs`에도 저장해 두었습니다.

```javascript
const SPREADSHEET_ID = "1v0-AhubC4vXzK-dzmA1G_S0qR8DYLOe1woqnAl7VL0s";
const SHEET_NAME = "Responses";

const HEADERS = [
  "submittedAt",
  "sampleId",
  "reportDate",
  "collectionDate",
  "specimen",
  "sex",
  "institution",
  "rs762551",
  "rs2069514",
  "rs2472297",
  "rs6968865",
  "score",
  "category",
  "metabolismSubtype",
  "percentile",
  "confidence",
  "metabolismScore",
  "regulationScore",
  "consent",
  "reportJson"
];

function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({
      ok: true,
      message: "Caffeine Atlas Google Sheets endpoint is active.",
      spreadsheetId: SPREADSHEET_ID,
      sheetName: SHEET_NAME
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const payload = JSON.parse((e.postData && e.postData.contents) || "{}");
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(SHEET_NAME) || spreadsheet.insertSheet(SHEET_NAME);

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
  }

  sheet.appendRow(HEADERS.map((key) => {
    if (key === "reportJson") {
      return JSON.stringify(payload.reportJson || {});
    }
    return payload[key] ?? "";
  }));

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

## 3. 웹앱 배포

1. Apps Script에서 `배포 > 새 배포`를 선택합니다.
2. 유형은 `웹 앱`으로 선택합니다.
3. 실행 계정은 `나`로 둡니다.
4. 액세스 권한은 사이트 공개 범위에 맞춰 설정합니다.
   - 외부 사용자가 리포트 결과를 저장해야 하면 `모든 사용자` 또는 배포 화면에서 허용 가능한 공개 옵션을 선택해야 합니다.
5. 배포 후 생성되는 웹앱 URL을 복사합니다.
6. 복사한 웹앱 URL을 브라우저 주소창에 열어봅니다.
   - 정상이라면 `ok: true`와 `Caffeine Atlas Google Sheets endpoint is active.` 문구가 보입니다.
   - Google Drive의 `현재 파일을 열 수 없습니다` 화면이 보이면 URL이 잘못됐거나 배포가 유효하지 않은 상태입니다.

## 4. 사이트에 URL 넣기

`caffeine-sensitivity-app/app.js`의 아래 값을 복사한 웹앱 URL로 바꿉니다.

```javascript
var GOOGLE_SHEETS_ENDPOINT = "https://script.google.com/macros/s/배포ID/exec";
```

## 주의

유전자형과 리포트 결과는 민감한 정보로 취급해야 합니다. 실제 운영 전에는 저장 동의 문구, 보관 기간, 접근 권한, 삭제 요청 처리 절차를 정리해 두는 것이 좋습니다.
