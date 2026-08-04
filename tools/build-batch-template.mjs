import fs from "node:fs/promises";

const artifactTool = await import(process.env.CAFFEINE_ARTIFACT_TOOL || "@oai/artifact-tool");
const { SpreadsheetFile, Workbook } = artifactTool;

const outputDir = "/Users/user/Documents/카페인/outputs/019fcc99-1804-79a3-b328-104fdea88068";
const assetPath = "/Users/user/Documents/카페인/caffeine-sensitivity-app/assets/caffeine-atlas-batch-template.xlsx";
const outputPath = `${outputDir}/caffeine-atlas-batch-template.xlsx`;

await fs.mkdir(outputDir, { recursive: true });

const workbook = Workbook.create();
const input = workbook.worksheets.add("일괄 입력");
const guide = workbook.worksheets.add("작성 안내");
const codebook = workbook.worksheets.add("입력값 코드북");

input.showGridLines = false;
guide.showGridLines = false;
codebook.showGridLines = false;

const headers = [[
  "Sample ID",
  "리포트 날짜",
  "채취일",
  "검체 종류",
  "성별",
  "CYP1A2*1F rs762551",
  "CYP1A2*1C rs2069514",
  "CYP1A1-CYP1A2 rs2472297",
  "AHR rs6968865",
]];

input.getRange("A1:I1").values = headers;
input.getRange("A1:I1").format = {
  fill: "#014F57",
  font: { bold: true, color: "#FFFFFF", size: 11 },
  horizontalAlignment: "center",
  verticalAlignment: "center",
  wrapText: true,
  borders: { preset: "outside", style: "medium", color: "#014F57" },
};
input.getRange("A1:I1").format.rowHeightPx = 44;
input.getRange("A2:I2").values = [[
  "예시-저장안됨",
  "2026-08-04",
  "2026-08-03",
  "구강상피세포",
  "미기재",
  "AA",
  "GG",
  "CC",
  "GG",
]];
input.getRange("A2:I2").format = {
  fill: "#E7F2F3",
  font: { bold: true, italic: true, color: "#014F57", size: 10 },
  verticalAlignment: "center",
  borders: { bottom: { style: "medium", color: "#8BAEB2" } },
};
input.getRange("A2:I2").format.rowHeightPx = 28;
input.getRange("A3:I202").format = {
  fill: "#FFF9E8",
  font: { color: "#243447", size: 10 },
  verticalAlignment: "center",
  borders: {
    insideHorizontal: { style: "thin", color: "#E5E9ED" },
    bottom: { style: "thin", color: "#C9D2D9" },
  },
};
input.getRange("A3:I202").format.rowHeightPx = 24;
input.getRange("A2:A202").format.numberFormat = "@";
input.getRange("B2:C202").format.numberFormat = "yyyy-mm-dd";
input.getRange("F2:I202").format.numberFormat = "@";

input.getRange("A:A").format.columnWidthPx = 145;
input.getRange("B:C").format.columnWidthPx = 108;
input.getRange("D:D").format.columnWidthPx = 158;
input.getRange("E:E").format.columnWidthPx = 92;
input.getRange("F:G").format.columnWidthPx = 170;
input.getRange("H:H").format.columnWidthPx = 194;
input.getRange("I:I").format.columnWidthPx = 150;
input.freezePanes.freezeRows(1);

input.getRange("D3:D202").dataValidation = {
  rule: { type: "list", formula1: "'입력값 코드북'!$A$2:$A$5" },
};
input.getRange("E3:E202").dataValidation = {
  rule: { type: "list", formula1: "'입력값 코드북'!$B$2:$B$5" },
};
input.getRange("F3:F202").dataValidation = {
  rule: { type: "list", formula1: "'입력값 코드북'!$C$2:$C$5" },
};
input.getRange("G3:G202").dataValidation = {
  rule: { type: "list", formula1: "'입력값 코드북'!$D$2:$D$5" },
};
input.getRange("H3:H202").dataValidation = {
  rule: { type: "list", formula1: "'입력값 코드북'!$E$2:$E$5" },
};
input.getRange("I3:I202").dataValidation = {
  rule: { type: "list", formula1: "'입력값 코드북'!$F$2:$F$5" },
};

input.getRange("A3:A202").conditionalFormats.add("duplicateValues", {
  format: { fill: "#FDE8E4", font: { color: "#B42318", bold: true } },
});
[
  ["A3:A202", "=AND(COUNTA($A3:$I3)>0,A3=\"\")"],
  ["B3:B202", "=AND(COUNTA($A3:$I3)>0,B3=\"\")"],
  ["D3:I202", "=AND(COUNTA($A3:$I3)>0,D3=\"\")"],
].forEach(([range, formula]) => {
  input.getRange(range).conditionalFormats.addCustom(formula, {
    fill: "#FDE8E4",
    font: { color: "#B42318" },
  });
});

guide.getRange("A1:F1").merge();
guide.getRange("A1:F1").values = [["Caffeine Atlas · 엑셀 일괄 업로드 작성 안내"]];
guide.getRange("A1:F1").format = {
  fill: "#014F57",
  font: { bold: true, color: "#FFFFFF", size: 16 },
  verticalAlignment: "center",
};
guide.getRange("A1:F1").format.rowHeightPx = 46;
guide.getRange("A3:F3").merge();
guide.getRange("A3:F3").values = [["2행은 저장되지 않는 작성 예시입니다. 노란색 입력 칸의 3행부터 대상자별 정보를 입력한 뒤, 웹사이트의 ‘엑셀 일괄 업로드’에서 이 파일을 선택하세요."]];
guide.getRange("A3:F3").format = {
  fill: "#EEF7F7",
  font: { bold: true, color: "#014F57", size: 11 },
  wrapText: true,
  verticalAlignment: "center",
};
guide.getRange("A3:F3").format.rowHeightPx = 44;

guide.getRange("A5:F14").values = [
  ["구분", "필수", "입력 형식", "허용값/예시", "검증 기준", "주의"],
  ["Sample ID", "필수", "텍스트", "SAMPLE-001", "파일 안에서 중복 불가", "이름·주민번호 대신 비식별 ID 권장"],
  ["리포트 날짜", "필수", "날짜", "2026-08-04", "YYYY-MM-DD", "엑셀 날짜 형식 사용"],
  ["채취일", "선택", "날짜", "2026-08-03", "YYYY-MM-DD 또는 빈칸", "리포트 날짜 이후인지 별도 확인"],
  ["검체 종류", "필수", "목록 선택", "구강상피세포", "코드북 허용값", "셀의 선택 목록 사용"],
  ["성별", "필수", "목록 선택", "미기재", "코드북 허용값", "셀의 선택 목록 사용"],
  ["rs762551", "필수", "목록 선택", "AA / AC / CC / 모름", "허용 유전자형", "핵심 표지자가 모름이면 유형 판정 보류"],
  ["rs2069514", "필수", "목록 선택", "GG / AG / AA / 모름", "허용 유전자형", "모름은 점수에서 제외"],
  ["rs2472297", "필수", "목록 선택", "CC / CT / TT / 모름", "허용 유전자형", "모름은 점수에서 제외"],
  ["rs6968865", "필수", "목록 선택", "GG / TG / TT / 모름", "허용 유전자형", "모름은 점수에서 제외"],
];
guide.getRange("A5:F5").format = {
  fill: "#DDEDEE",
  font: { bold: true, color: "#243447" },
  horizontalAlignment: "center",
  verticalAlignment: "center",
  borders: { preset: "outside", style: "medium", color: "#8BAEB2" },
};
guide.getRange("A6:F14").format = {
  font: { color: "#34495E", size: 10 },
  wrapText: true,
  verticalAlignment: "top",
  borders: { preset: "inside", style: "thin", color: "#DCE4E8" },
};
guide.getRange("A16:F16").merge();
guide.getRange("A16:F16").values = [["개인정보 주의: 유전자형과 리포트 정보는 민감정보로 취급하세요. 파일에는 가능한 한 이름·연락처·주민등록번호를 넣지 말고, 권한 있는 담당자만 보관·업로드하세요."]];
guide.getRange("A16:F16").format = {
  fill: "#FFF2EF",
  font: { bold: true, color: "#B5472F" },
  wrapText: true,
  verticalAlignment: "center",
};
guide.getRange("A16:F16").format.rowHeightPx = 52;
guide.getRange("A:A").format.columnWidthPx = 126;
guide.getRange("B:B").format.columnWidthPx = 70;
guide.getRange("C:C").format.columnWidthPx = 105;
guide.getRange("D:D").format.columnWidthPx = 185;
guide.getRange("E:E").format.columnWidthPx = 145;
guide.getRange("F:F").format.columnWidthPx = 225;
guide.freezePanes.freezeRows(5);

codebook.getRange("A1:F5").values = [
  ["검체 종류", "성별", "rs762551", "rs2069514", "rs2472297", "rs6968865"],
  ["구강상피세포", "미기재", "AA", "GG", "CC", "GG"],
  ["타액", "여성", "AC", "AG", "CT", "TG"],
  ["혈액", "남성", "CC", "AA", "TT", "TT"],
  ["기존 유전자형 데이터", "기타", "모름", "모름", "모름", "모름"],
];
codebook.getRange("A1:F1").format = {
  fill: "#014F57",
  font: { bold: true, color: "#FFFFFF" },
  horizontalAlignment: "center",
};
codebook.getRange("A2:F5").format = {
  fill: "#F7FAFA",
  font: { color: "#34495E" },
  horizontalAlignment: "center",
  borders: { preset: "inside", style: "thin", color: "#DCE4E8" },
};
codebook.getRange("A:A").format.columnWidthPx = 190;
codebook.getRange("B:F").format.columnWidthPx = 110;
codebook.freezePanes.freezeRows(1);

const inputCheck = await workbook.inspect({
  kind: "table",
  range: "일괄 입력!A1:I6",
  include: "values,formulas",
  tableMaxRows: 6,
  tableMaxCols: 9,
});
console.log(inputCheck.ndjson);

const errorCheck = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 100 },
  summary: "final formula error scan",
});
console.log(errorCheck.ndjson);

for (const [sheetName, range, fileName] of [
  ["일괄 입력", "A1:I14", "batch-template-input.png"],
  ["작성 안내", "A1:F16", "batch-template-guide.png"],
  ["입력값 코드북", "A1:F5", "batch-template-codebook.png"],
]) {
  const preview = await workbook.render({ sheetName, range, scale: 1.5, format: "png" });
  await fs.writeFile(`${outputDir}/${fileName}`, new Uint8Array(await preview.arrayBuffer()));
}

const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);
await output.save(assetPath);
await fs.unlink(`${outputPath}.inspect.ndjson`).catch(() => {});
await fs.unlink(`${assetPath}.inspect.ndjson`).catch(() => {});
console.log(JSON.stringify({ outputPath, assetPath }));

if (process.env.CAFFEINE_BATCH_TEST_FIXTURES === "1") {
  input.getRange("A3:I5").values = [
    ["TEST-FAST", "2026-08-04", "2026-08-03", "구강상피세포", "미기재", "AA", "GG", "CC", "GG"],
    ["TEST-MID", "2026/08/04", "", "Saliva", "Female", "CA", "GA", "TC", "GT"],
    ["TEST-SLOW", "2026.08.04", "2026.08.02", "혈액", "남성", "CC", "AA", "TT", "TT"],
  ];
  const validFixture = await SpreadsheetFile.exportXlsx(workbook);
  await validFixture.save("/private/tmp/caffeine-batch-valid.xlsx");

  input.getRange("A3:I202").clear({ applyTo: "contents" });
  input.getRange("A3:I5").values = [
    ["DUPLICATE", "2026-08-04", "", "구강상피세포", "미기재", "AA", "GG", "CC", "GG"],
    ["DUPLICATE", "2026-08-04", "", "타액", "여성", "AC", "AG", "CT", "TG"],
    ["BAD-GENOTYPE", "2026-99-04", "", "혈액", "남성", "XX", "AA", "TT", "TT"],
  ];
  const invalidFixture = await SpreadsheetFile.exportXlsx(workbook);
  await invalidFixture.save("/private/tmp/caffeine-batch-invalid.xlsx");
  console.log(JSON.stringify({
    validFixture: "/private/tmp/caffeine-batch-valid.xlsx",
    invalidFixture: "/private/tmp/caffeine-batch-invalid.xlsx",
  }));
}
