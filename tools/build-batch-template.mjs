import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";

// Resolve the authoring runtime independently of the checkout location/OS.
// CAFFEINE_ARTIFACT_TOOL may point at an installed package or an absolute module.
async function loadArtifactTool() {
  if (process.env.CAFFEINE_ARTIFACT_TOOL) {
    const target = process.env.CAFFEINE_ARTIFACT_TOOL;
    return import(path.isAbsolute(target) ? pathToFileURL(target).href : target);
  }
  const runtimeNodeModules = process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
  const runtimeNode = runtimeNodeModules ? path.dirname(runtimeNodeModules)
    : path.join(os.homedir(), ".cache/codex-runtimes/codex-primary-runtime/dependencies/node");
  try {
    const requireRuntime = createRequire(path.join(runtimeNode, "template-loader.cjs"));
    return await import(pathToFileURL(requireRuntime.resolve("@oai/artifact-tool")).href);
  } catch {
    return import("@oai/artifact-tool");
  }
}
const artifactTool = await loadArtifactTool();
const { SpreadsheetFile, Workbook } = artifactTool;

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
const assetPath = path.join(repositoryRoot, "caffeine-sensitivity-app/assets/caffeine-atlas-batch-template.xlsx");
const outputDir = process.env.CAFFEINE_BATCH_OUTPUT_DIR || path.join(os.tmpdir(), "caffeine-batch-template");
const outputPath = path.join(outputDir, "caffeine-atlas-batch-template.xlsx");

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
  new Date("2026-11-08T00:00:00Z"),
  new Date("2026-11-07T00:00:00Z"),
  "구강상피세포",
  "미기재",
  "AA",
  "GG",
  "CC",
  "AT",
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
  rule: { type: "list", values: ["구강상피세포", "타액", "혈액", "기존 유전자형 데이터"] },
};
input.getRange("E3:E202").dataValidation = {
  rule: { type: "list", values: ["미기재", "여성", "남성", "기타"] },
};
input.getRange("F3:F202").dataValidation = {
  rule: { type: "list", values: ["AA", "AC", "CC", "모름"] },
};
input.getRange("G3:G202").dataValidation = {
  rule: { type: "list", values: ["GG", "AG", "AA", "모름"] },
};
input.getRange("H3:H202").dataValidation = {
  rule: { type: "list", values: ["CC", "CT", "TT", "모름"] },
};
input.getRange("I3:I202").dataValidation = {
  rule: { type: "list", values: ["AA", "AT", "TT", "모름"] },
};

input.getRange("A3:A202").conditionalFormats.addCustom("=AND($A3<>\"\",COUNTIF($A$3:$A$202,$A3)>1)", {
  fill: "#FDE8E4", font: { color: "#B42318", bold: true },
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
guide.getRange("A3:F3").values = [["‘일괄 입력’ 시트의 노란색 3~202행에 최대 200명을 입력하세요. 2행의 ‘예시-저장안됨’은 분석에서 제외됩니다. 웹사이트의 ‘엑셀 일괄 업로드’에서 분석한 뒤 결과를 .xlsx로 내려받을 수 있습니다."]];
guide.getRange("A3:F3").format = {
  fill: "#EEF7F7",
  font: { bold: true, color: "#014F57", size: 11 },
  wrapText: true,
  verticalAlignment: "center",
};
guide.getRange("A3:F3").format.rowHeightPx = 56;

guide.getRange("A5:F14").values = [
  ["구분", "필수", "입력 형식", "허용값/예시", "검증 기준", "주의"],
  ["Sample ID", "필수", "텍스트", "SAMPLE-001", "파일 내 중복 불가 / 최대 120자", "실명·학번·환자번호 대신 연구용 코드 사용"],
  ["리포트 날짜", "필수", "날짜", "2026-11-08", "YYYY-MM-DD", "날짜 형식 또는 같은 형식의 텍스트"],
  ["채취일", "선택", "날짜", "2026-11-07", "YYYY-MM-DD 또는 빈칸", "모르면 비워 두세요"],
  ["검체 종류", "필수", "목록 선택", "구강상피세포", "코드북 허용값", "셀의 선택 목록 사용"],
  ["성별", "필수", "목록 선택", "미기재", "코드북 허용값", "셀의 선택 목록 사용"],
  ["rs762551", "필수", "목록 선택", "AA / AC / CC / 모름", "허용 유전자형", "모름이면 종합 유형 및 대사 판정 보류"],
  ["rs2069514", "필수", "목록 선택", "GG / AG / AA / 모름", "허용 유전자형", "모름은 점수에서 제외"],
  ["rs2472297", "필수", "목록 선택", "CC / CT / TT / 모름", "허용 유전자형", "모름은 점수에서 제외"],
  ["rs6968865", "필수", "목록 선택", "AA / AT / TT / 모름", "A/T allele만 허용", "GG / GT 등 다른 방향의 값은 입력 금지"],
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
guide.getRange("A6:F14").format.rowHeightPx = 40;
guide.getRange("A16:F16").merge();
guide.getRange("A16:F16").values = [["정보 보호: 이름·연락처·주민등록번호·학번·환자번호를 입력하지 마세요. 유전자형과 결과 파일은 권한 있는 담당자가 보관하세요. 일괄 분석과 파일 다운로드는 브라우저에서 처리하며 Google Sheets 저장은 별도 기능입니다."]];
guide.getRange("A16:F16").format = {
  fill: "#FFF2EF",
  font: { bold: true, color: "#B5472F" },
  wrapText: true,
  verticalAlignment: "center",
};
guide.getRange("A16:F16").format.rowHeightPx = 52;
const guideNotes = [
  [18, "작성 규칙", "시트명과 1행의 열 제목을 유지하세요. 2행은 예시로 남겨 두거나 삭제할 수 있습니다. 빈 행은 건너뜁니다. 분석할 1명은 1행으로 작성하세요."],
  [20, "유전자형 표기", "표시된 allele 기준의 2개 염기를 입력합니다(예: A/T 또는 AT). TA는 AT로 정규화됩니다. 이는 primer/probe의 5′→3′ 서열 입력 칸이 아닙니다. 반대 가닥 표기를 임의로 변환하지 마세요."],
  [22, "모름과 빈칸", "확인하지 못한 SNP는 ‘모름’을 선택하세요. 빈칸은 입력 오류입니다. ‘모름’은 확인된 유전자형 수에 포함되지 않으며 입력 완성도는 예측 정확도가 아닙니다."],
  [24, "결과 해석", "민감도 지수 낮음·중간·높음은 연구·교육용 모형의 구간입니다. 실제 카페인 분해 속도, 각성 효과, 커피를 마신 뒤 잘 자는지 또는 안전 섭취량을 확정하지 않습니다."],
  [26, "오류 확인", "웹사이트에서 행별 오류를 확인하고 양식을 수정해 다시 분석하세요. 오류가 있는 행은 정상 결과와 구분됩니다. 다운로드한 결과는 입력 양식과 별도로 보관하세요."],
];
for (const [row, title, text] of guideNotes) {
  guide.getRange(`A${row}:F${row}`).merge();
  guide.getRange(`A${row}:F${row}`).values = [[`${title}: ${text}`]];
  guide.getRange(`A${row}:F${row}`).format = {
    fill: "#F4F7F8", font: { color: "#34495E", size: 10 },
    wrapText: true, verticalAlignment: "center", rowHeightPx: 48,
  };
}
guide.getRange("A:A").format.columnWidthPx = 126;
guide.getRange("B:B").format.columnWidthPx = 70;
guide.getRange("C:C").format.columnWidthPx = 105;
guide.getRange("D:D").format.columnWidthPx = 185;
guide.getRange("E:E").format.columnWidthPx = 145;
guide.getRange("F:F").format.columnWidthPx = 225;

codebook.getRange("A1:F5").values = [
  ["검체 종류", "성별", "rs762551", "rs2069514", "rs2472297", "rs6968865"],
  ["구강상피세포", "미기재", "AA", "GG", "CC", "AA"],
  ["타액", "여성", "AC", "AG", "CT", "AT"],
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

workbook.recalculate();

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
  ["작성 안내", "A1:F26", "batch-template-guide.png"],
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
    ["TEST-FAST", "2026-08-04", "2026-08-03", "구강상피세포", "미기재", "AA", "GG", "CC", "AA"],
    ["TEST-MID", "2026/08/04", "", "Saliva", "Female", "CA", "GA", "TC", "TA"],
    ["TEST-SLOW", "2026.08.04", "2026.08.02", "혈액", "남성", "CC", "AA", "TT", "TT"],
  ];
  const validFixture = await SpreadsheetFile.exportXlsx(workbook);
  const validFixturePath = path.join(outputDir, "caffeine-batch-valid.xlsx");
  await validFixture.save(validFixturePath);

  input.getRange("A3:I202").clear({ applyTo: "contents" });
  input.getRange("A3:I5").values = [
    ["DUPLICATE", "2026-08-04", "", "구강상피세포", "미기재", "AA", "GG", "CC", "AA"],
    ["DUPLICATE", "2026-08-04", "", "타액", "여성", "AC", "AG", "CT", "AT"],
    ["BAD-GENOTYPE", "2026-99-04", "", "혈액", "남성", "XX", "AA", "TT", "TT"],
  ];
  const invalidFixture = await SpreadsheetFile.exportXlsx(workbook);
  const invalidFixturePath = path.join(outputDir, "caffeine-batch-invalid.xlsx");
  await invalidFixture.save(invalidFixturePath);
  console.log(JSON.stringify({
    validFixture: validFixturePath,
    invalidFixture: invalidFixturePath,
  }));
}
