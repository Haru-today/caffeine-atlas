const SPREADSHEET_ID = "1v0-AhubC4vXzK-dzmA1G_S0qR8DYLOe1woqnAl7VL0s";
const SHEET_NAME = "Responses";
const KOREA_TIME_ZONE = "Asia/Seoul";

const FIELD_KEYS = [
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
  "rankOutOf100",
  "reportJson"
];

const DISPLAY_HEADERS = [
  "저장 시각",
  "Sample ID",
  "리포트 날짜",
  "채취일",
  "검체 종류",
  "성별",
  "기관명",
  "CYP1A2*1F rs762551",
  "CYP1A2*1C rs2069514",
  "CYP1A1-CYP1A2 rs2472297",
  "AHR rs6968865",
  "민감도 점수",
  "결과 유형",
  "대사 판정",
  "백분위",
  "입력 완성도",
  "대사 점수",
  "조절 점수",
  "저장 동의",
  "100명 중 예상 등수",
  "전체 리포트 JSON"
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
  if (payload.action === "setupTemplate") {
    setupTemplate();
    return jsonResponse({ ok: true, action: "setupTemplate" });
  }

  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  spreadsheet.setSpreadsheetTimeZone(KOREA_TIME_ZONE);
  const sheet = spreadsheet.getSheetByName(SHEET_NAME) || spreadsheet.insertSheet(SHEET_NAME);

  ensureResponseHeader_(sheet);

  sheet.appendRow(FIELD_KEYS.map((key) => {
    if (key === "submittedAt") {
      return payload.submittedAt || formatKoreaDateTime_(new Date());
    }
    if (key === "rankOutOf100") {
      return payload.rankOutOf100 ?? rankFromPercentile_(payload.percentile);
    }
    if (key === "reportJson") {
      return JSON.stringify(payload.reportJson || {});
    }
    return payload[key] ?? "";
  }));

  return jsonResponse({ ok: true });
}

function jsonResponse(value) {
  return ContentService
    .createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}

function setupTemplate() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  spreadsheet.setSpreadsheetTimeZone(KOREA_TIME_ZONE);
  ensureResponsesSheet_(spreadsheet);
  buildDashboard_(spreadsheet);
  buildSummary_(spreadsheet);
  buildConsentLog_(spreadsheet);
  buildDataDictionary_(spreadsheet);
}

function ensureResponsesSheet_(spreadsheet) {
  const sheet = spreadsheet.getSheetByName(SHEET_NAME) || spreadsheet.insertSheet(SHEET_NAME);
  ensureResponseHeader_(sheet);
  updateRankColumn_(sheet);
  formatHeader_(sheet, DISPLAY_HEADERS.length);
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, DISPLAY_HEADERS.length);
}

function ensureResponseHeader_(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(DISPLAY_HEADERS);
    return;
  }
  sheet.getRange(1, 1, 1, DISPLAY_HEADERS.length).setValues([DISPLAY_HEADERS]);
}

function getOrResetSheet_(spreadsheet, name) {
  const sheet = spreadsheet.getSheetByName(name) || spreadsheet.insertSheet(name);
  sheet.clear();
  sheet.clearConditionalFormatRules();
  return sheet;
}

function buildDashboard_(spreadsheet) {
  const sheet = getOrResetSheet_(spreadsheet, "Dashboard");
  sheet.getRange("A1").setValue("Caffeine Atlas Dashboard");
  sheet.getRange("A3:B9").setValues([
    ["총 저장 건수", '=COUNTA(Responses!A2:A)'],
    ["동의 건수", '=COUNTIF(Responses!S2:S,TRUE)'],
    ["평균 민감도 점수", '=IFERROR(ROUND(AVERAGE(Responses!L2:L),1),"")'],
    ["평균 백분위", '=IFERROR(ROUND(AVERAGE(Responses!O2:O),1),"")'],
    ["평균 예상 등수", '=IFERROR(ROUND(AVERAGE(Responses!T2:T),0)&"등 / 100명","")'],
    ["최신 저장 시각", '=IFERROR(MAX(Responses!A2:A),"")'],
    ["최근 Sample ID", '=IFERROR(LOOKUP(2,1/(Responses!B2:B<>""),Responses!B2:B),"")']
  ]);
  sheet.getRange("A11").setValue("결과 유형 분포");
  sheet.getRange("A12").setFormula('=QUERY(Responses!M2:M,"select M, count(M) where M is not null group by M label M \'결과 유형\', count(M) \'건수\'",0)');
  sheet.getRange("D11:E15").setValues([
    ["점수 구간", "건수"],
    ["0-33.3", '=COUNTIFS(Responses!L2:L,">=0",Responses!L2:L,"<=33.3")'],
    ["33.4-66.6", '=COUNTIFS(Responses!L2:L,">33.3",Responses!L2:L,"<=66.6")'],
    ["66.7-100", '=COUNTIFS(Responses!L2:L,">66.6",Responses!L2:L,"<=100")'],
    ["미기록", '=COUNTBLANK(Responses!L2:L)']
  ]);
  sheet.getRange("A17").setValue("최근 저장 데이터");
  sheet.getRange("A18").setFormula('=QUERY(Responses!A:T,"select A,B,L,M,N,O,T where A is not null order by A desc limit 10 label A \'저장 시각\', B \'Sample ID\', L \'점수\', M \'유형\', N \'대사 판정\', O \'백분위\', T \'100명 중 예상 등수\'",1)');
  finishTemplateSheet_(sheet, 8);
}

function buildSummary_(spreadsheet) {
  const sheet = getOrResetSheet_(spreadsheet, "Summary");
  sheet.getRange("A1").setValue("Result Summary");
  sheet.getRange("A3").setFormula('=QUERY(Responses!A:T,"select M, count(M), avg(L), avg(O), avg(T), avg(P), avg(Q), avg(R) where A is not null group by M label M \'결과 유형\', count(M) \'건수\', avg(L) \'평균 점수\', avg(O) \'평균 백분위\', avg(T) \'평균 예상 등수\', avg(P) \'평균 완성도\', avg(Q) \'평균 대사 점수\', avg(R) \'평균 조절 점수\'",1)');
  sheet.getRange("A15").setValue("Genotype Counts");
  sheet.getRange("A16:E16").setValues([["SNP", "Genotype 1", "Count 1", "Genotype 2", "Count 2"]]);
  sheet.getRange("A17:E20").setValues([
    ["rs762551", "AA", '=COUNTIF(Responses!H2:H,"AA")', "AC", '=COUNTIF(Responses!H2:H,"AC")'],
    ["rs2069514", "AA", '=COUNTIF(Responses!I2:I,"AA")', "AG", '=COUNTIF(Responses!I2:I,"AG")'],
    ["rs2472297", "TT", '=COUNTIF(Responses!J2:J,"TT")', "CT", '=COUNTIF(Responses!J2:J,"CT")'],
    ["rs6968865", "TT", '=COUNTIF(Responses!K2:K,"TT")', "TG", '=COUNTIF(Responses!K2:K,"TG")']
  ]);
  finishTemplateSheet_(sheet, 7);
}

function buildConsentLog_(spreadsheet) {
  const sheet = getOrResetSheet_(spreadsheet, "Consent Log");
  sheet.getRange("A1").setValue("Consent Log");
  sheet.getRange("A3").setFormula('=QUERY(Responses!A:T,"select A,B,S where A is not null label A \'저장 시각\', B \'Sample ID\', S \'저장 동의\'",1)');
  sheet.getRange("E3:F5").setValues([
    ["동의", '=COUNTIF(Responses!S2:S,TRUE)'],
    ["미동의/공란", '=COUNTIF(Responses!S2:S,FALSE)+COUNTBLANK(Responses!S2:S)'],
    ["전체", '=COUNTA(Responses!A2:A)']
  ]);
  finishTemplateSheet_(sheet, 6);
}

function buildDataDictionary_(spreadsheet) {
  const sheet = getOrResetSheet_(spreadsheet, "Data Dictionary");
  sheet.getRange("A1").setValue("Data Dictionary");
  sheet.getRange("A3:C24").setValues([
    ["표시 컬럼명", "의미", "저장 출처"],
    ["저장 시각", "데이터가 시트에 저장된 시각", "웹사이트"],
    ["Sample ID", "검체 또는 사용자 식별용 Sample ID", "입력값"],
    ["리포트 날짜", "리포트 생성일", "입력값"],
    ["채취일", "검체 채취일", "입력값"],
    ["검체 종류", "구강상피세포, 타액, 혈액 등", "입력값"],
    ["성별", "성별 표기", "입력값"],
    ["기관명", "리포트 운영 또는 입력 기관명", "입력값"],
    ["CYP1A2*1F rs762551", "CYP1A2*1F 유전자형", "입력값"],
    ["CYP1A2*1C rs2069514", "CYP1A2*1C 유전자형", "입력값"],
    ["CYP1A1-CYP1A2 rs2472297", "CYP1A1-CYP1A2 좌위 유전자형", "입력값"],
    ["AHR rs6968865", "AHR 유전자형", "입력값"],
    ["민감도 점수", "카페인 민감도 지수", "계산 결과"],
    ["결과 유형", "각성형, 잠잠형, 잠꾸러기형 등", "계산 결과"],
    ["대사 판정", "대사 레이어 판정", "계산 결과"],
    ["백분위", "참조분포 내 위치", "계산 결과"],
    ["입력 완성도", "입력 SNP 완성도", "계산 결과"],
    ["대사 점수", "대사 레이어 점수", "계산 결과"],
    ["조절 점수", "조절 레이어 점수", "계산 결과"],
    ["저장 동의", "리포트 데이터 저장 동의 여부", "동의 체크"],
    ["100명 중 예상 등수", "백분위를 100명 기준 순위로 환산한 값. 1등에 가까울수록 높은 카페인 민감도 위치입니다.", "계산 결과"],
    ["전체 리포트 JSON", "결과 해석, 섭취 가이드, 유전자형 상세를 포함한 전체 리포트 원본", "계산 결과"]
  ]);
  finishTemplateSheet_(sheet, 3);
}

function formatKoreaDateTime_(date) {
  return Utilities.formatDate(date, KOREA_TIME_ZONE, "yyyy-MM-dd HH:mm:ss 'KST'");
}

function rankFromPercentile_(percentile) {
  const value = Number(percentile);
  if (!Number.isFinite(value)) return "";
  return Math.max(1, Math.min(100, Math.round(101 - value)));
}

function updateRankColumn_(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  const percentileValues = sheet.getRange(2, 15, lastRow - 1, 1).getValues();
  const rankValues = percentileValues.map((row) => [rankFromPercentile_(row[0])]);
  sheet.getRange(2, 20, rankValues.length, 1).setValues(rankValues);
}

function finishTemplateSheet_(sheet, columnCount) {
  formatHeader_(sheet, columnCount);
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, columnCount);
}

function formatHeader_(sheet, columnCount) {
  sheet.getRange(1, 1, 1, Math.max(columnCount, 1))
    .setFontWeight("bold")
    .setBackground("#014f57")
    .setFontColor("#ffffff");
}
