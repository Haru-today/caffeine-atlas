"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");

const root = readFileSync("index.html", "utf8");
const landing = readFileSync("caffeine-sensitivity-app/index.html", "utf8");
const analyzer = readFileSync("caffeine-sensitivity-app/analyzer.html", "utf8");
const source = readFileSync("caffeine-sensitivity-app/app.js", "utf8");
const css = readFileSync("caffeine-sensitivity-app/styles.css", "utf8");

test("existing QR-compatible root path still leads to the same Caffeine Atlas landing page", () => {
  assert.match(root, /http-equiv="refresh" content="0; url=\.\/caffeine-sensitivity-app\/index\.html"/);
  assert.match(root, /href="\.\/caffeine-sensitivity-app\/index\.html"/);
  assert.match(root, /https:\/\/haru-today\.github\.io\/caffeine-atlas\/caffeine-sensitivity-app\/index\.html/);
});

test("landing page clearly launches an unrestricted public trial", () => {
  assert.match(landing, /로그인 없이 체험 시작/);
  assert.match(landing, /href="\.\/analyzer\.html"/);
  assert.match(landing, /연구·교육용/);
});

test("public analyzer preserves genetic interpretation and user-side PDF and report downloads", () => {
  assert.match(analyzer, /<body class="public-demo">/);
  for (const id of ["geneGrid", "analyzeBtn", "saveBtn", "pdfBtn", "resultContent"]) {
    assert.match(analyzer, new RegExp('id="' + id + '"'));
  }
  assert.match(source, /function saveDetailedReport/);
  assert.match(source, /function savePdfReport/);
  assert.match(source, /function buildComputedResult/);
  assert.match(source, /function normalizeGenotype/);
  assert.match(analyzer, /회원가입 없이 체험하는 Caffeine Atlas/);
  assert.match(analyzer, /개인식별정보/);
});

test("local batch analysis is public while cloud storage requires research mode", () => {
  assert.match(analyzer, /<div class="input-mode-switch"/);
  assert.match(analyzer, /<label class="consent-card research-only"/);
  assert.match(analyzer, /<section class="batch-panel" id="batchModePanel"/);
  assert.match(analyzer, /<button class="tool-button primary research-only" id="sheetSaveBtn"/);
  assert.match(css, /body\.public-demo \.research-only\s*,\s*body\.research-mode \.public-only\s*\{\s*display:\s*none\s*!important/);
  assert.match(analyzer, /id="sheetConsent"/);
  assert.match(analyzer, /id="batchAnalyzeSaveBtn"/);
  assert.match(analyzer, /id="batchAnalyzeBtn"/);
  assert.match(analyzer, /id="batchDownloadBtn"/);
  assert.match(analyzer, /href="\.\/assets\/caffeine-atlas-batch-template\.xlsx/);
  assert.match(source, /function processLocalBatchUpload\(\)/);
  assert.match(source, /function buildBatchResultWorkbook\(records\)/);
  assert.match(source, /function downloadBatchResults\(\)/);
});

test("public Caffeine Atlas bundle has no working Google Apps Script endpoint", () => {
  assert.match(source, /var RESEARCH_STORAGE_MODE = false;/);
  assert.match(source, /var GOOGLE_SHEETS_ENDPOINT = "";/);
  assert.doesNotMatch(source, /https:\/\/script\.google\.com\/macros/);
  assert.match(source, /function saveConfirmedPayload\(payload, expectedCount\)\s*\{\s*if \(!RESEARCH_STORAGE_MODE \|\| !GOOGLE_SHEETS_ENDPOINT\)/);
  assert.match(source, /function processBatchUpload\(\)\s*\{\s*if \(!RESEARCH_STORAGE_MODE \|\| !GOOGLE_SHEETS_ENDPOINT\)/);
  assert.match(source, /function saveToGoogleSheets\(\)\s*\{\s*if \(!RESEARCH_STORAGE_MODE \|\| !GOOGLE_SHEETS_ENDPOINT\)/);
  assert.match(source, /function requestEndpointStatus\(parameters\)\s*\{\s*if \(!RESEARCH_STORAGE_MODE \|\| !GOOGLE_SHEETS_ENDPOINT\)/);
});

test("visible public notices accurately disclose data handling limitations", () => {
  assert.match(analyzer, /공개 체험에서 입력한 내용은 Google Sheets로 전송하거나 저장하지 않습니다/);
  assert.match(analyzer, /상세 리포트는 파일로 내려받을 수 있습니다/);
  assert.match(analyzer, /브라우저의 ‘PDF로 저장’ 기능을 이용하세요/);
  assert.match(analyzer, /연구·교육용 해석 리포트이며 질병 진단/);
  assert.match(analyzer, /https:\/\/haru-today\.github\.io\/caffeine-atlas\/privacy\.html/);
  assert.match(analyzer, /https:\/\/haru-today\.github\.io\/caffeine-atlas\/terms\.html/);
});


test("one-tap example is explicitly fictional and does not enable research uploads", () => {
  assert.match(analyzer, /id="exampleDemoBtn"/);
  assert.match(analyzer, /가상 예시 리포트 바로 보기/);
  assert.match(analyzer, /실제 사람이 아닌 가상 예시/);
  assert.match(source, /function showExampleReport\(\)/);
  assert.match(source, /if \(RESEARCH_STORAGE_MODE\) return;/);
  for (const [rsid, genotype] of [["rs762551", "AA"], ["rs2069514", "GG"],
    ["rs2472297", "CC"], ["rs6968865", "AT"]]) {
    assert.ok(source.includes('["' + rsid + '", "' + genotype + '"]'));
  }
  assert.match(source, /elements\.sampleId\.value = "DEMO-001"/);
  assert.match(source, /if \(!RESEARCH_STORAGE_MODE\)\s*\{\s*\/\/ Important for a shared symposium demo device/);
});

test("research reference distribution is not falsely labeled arbitrary or nationwide validated", () => {
  assert.match(analyzer, /Research reference data/);
  assert.match(analyzer, /연구 참조분포에서의 위치/);
  assert.match(analyzer, /연구에서 확보한 검사결과를 참고해 구성한 7개 점수 구간/);
  assert.match(analyzer, /전체 인구의 대표 순위나 임상적 카페인 민감도 진단을 뜻하지 않습니다/);
  assert.doesNotMatch(analyzer, /KPGP PRS distribution|비슷한 사람들 중 위치|임의 구간/);
  assert.doesNotMatch(source, /대한민국 평균 100명 중|7개의 임의 예시 구간|임의 7구간|예시 분포/);
  assert.match(source, /ctx\.fillText\("연구 참조분포", 0, 0\)/);
  assert.match(source, /개 구간 중 낮은 쪽에서 /);
  assert.match(source, /전체 인구를 대표하거나 임상적으로 검증된 순위는 아닙니다/);
  assert.match(landing, /실제 인구집단의 백분위나 개인별 안전 섭취량은 아닙니다/);
});


test("four-SNP coverage is not misrepresented as predictive confidence", () => {
  assert.match(analyzer, /<span>입력 완성도<\/span>/);
  assert.match(analyzer, /예측 정확도·통계적 신뢰도를 의미하지 않습니다/);
  assert.doesNotMatch(analyzer, /<span>신뢰도<\/span>/);
  assert.match(source, /<span>분해 방향\(모형\)<\/span>/);
  assert.match(source, /<span>입력 완성도<\/span>/);
  assert.doesNotMatch(source, /<span>Confidence<\/span>|<span>신뢰도<\/span>/);
  // Keep historical JSON schema stable; only copy/labels change.
  assert.match(source, /confidence: confidence/);
});

test("public landing and analyzer use readable mobile styling without introducing login gates", () => {
  assert.match(landing, /styles\.css\?v=readability-20261016/);
  assert.match(analyzer, /styles\.css\?v=readability-20261016/);
  assert.match(css, /2026-10-16 public\/mobile readability polish/);
  assert.match(css, /\.nav-links\s*\{[^}]*overflow-x:\s*auto/s);
  assert.match(css, /\.hero-actions \.hero-button\s*\{[^}]*min-height:\s*48px/s);
  assert.match(css, /\.public-demo-notice p[\s\S]*font-size:\s*0\.94rem/);
  assert.match(landing, /로그인 없이 체험 시작/);
  assert.match(analyzer, /<body class="public-demo">/);
  assert.doesNotMatch(landing + analyzer, /href="\/login(?:\.html)?"/);
});

test("homepage styles live in home.css and never reach other pages", () => {
  assert.match(landing, /<body class="landing">/);
  assert.match(landing, /href="\.\/home\.css\?v=[\w-]+"/);
  assert.doesNotMatch(analyzer, /home\.css/);
  const home = readFileSync("caffeine-sensitivity-app/home.css", "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  const selectors = [...home.matchAll(/([^{}]+)\{/g)]
    .map(match => match[1].trim())
    .filter(selector => selector && !selector.startsWith("@"));
  assert.ok(selectors.length > 20);
  for (const group of selectors) {
    for (const selector of group.split(",")) assert.match(selector.trim(), /^body\.landing(?![\w-])/, selector);
  }
  assert.doesNotMatch(home, /@import|url\(\s*["']?(?:https?:)?\/\//, "no external font or asset requests");
});

test("homepage sample card is exactly what the model returns for the analyzer's fictional example", () => {
  const demo = source.match(/var exampleGenotypes = \[([\s\S]*?)\];/)[1];
  const pairs = [...demo.matchAll(/\["(rs\d+)", "([ACGT]{2})"\]/g)].map(match => [match[1], match[2]]);
  assert.equal(pairs.length, 4);
  for (const [rsid, code] of pairs) assert.ok(landing.includes(`<span>${rsid} ${code}</span>`), rsid);
  assert.match(landing, /가상 예시\(DEMO-001\)/);

  // Run the real scoring code from app.js instead of copying its weights or thresholds.
  const window = {};
  const document = { getElementById: () => ({ value: "", options: [], classList: { toggle() {} } }) };
  assert.match(source, /  init\(\);\s*\}\(\)\);/);
  require("node:vm").runInNewContext(source.replace("  init();",
    "  window.__model = { genes: genes, getGenotype: getGenotype, buildComputedResult: buildComputedResult };"),
    { window, document, console });
  const { genes, getGenotype, buildComputedResult } = window.__model;
  const selection = {};
  for (const [rsid, code] of pairs) {
    const gene = genes.find(item => item.id === rsid);
    selection[rsid] = getGenotype(gene, code);
  }
  const result = buildComputedResult(selection);

  const card = landing.match(/<figure class="home-sample"[\s\S]*?<\/figure>/)[0];
  const text = cls => card.match(new RegExp(`class="${cls}">([^<]*)`))[1].trim();
  assert.equal(text("home-sample-score"), result.score.toFixed(1));
  assert.equal(text("home-sample-type"), result.category.label);
  assert.match(card, new RegExp(`class="home-sample-type">[^<]*<span>${result.category.badge}</span>`));
  assert.equal(text("home-sample-title"), result.category.title);
  const tip = text("home-sample-tip");
  assert.ok(result.category.text.includes(tip) || result.category.recommendations.includes(tip), "tip is an existing report sentence");

  const values = [...card.matchAll(/class="home-bar-value">([^<]+)</g)].map(match => match[1]);
  const widths = [...card.matchAll(/<i style="width:(\d+)%"><\/i>/g)].map(match => Number(match[1]));
  const met = Math.round(result.metabolismNorm * 100);
  const beh = Math.round(result.behaviorNorm * 100);
  assert.deepEqual(values, [met + "/100", beh + "/100", result.valid.length + "/" + genes.length]);
  assert.deepEqual(widths, [met, beh, result.confidence]);
});

function loadModel() {
  const window = {};
  const document = { getElementById: () => ({ value: "", options: [], classList: { toggle() {} } }) };
  require("node:vm").runInNewContext(source.replace("  init();",
    "  window.__model = { genes: genes, getGenotype: getGenotype, buildComputedResult: buildComputedResult," +
    " calculateReferencePosition: calculateReferencePosition, referencePositionText: referencePositionText," +
    " partialInputNote: partialInputNote };"),
    { window, document, console });
  return window.__model;
}

function resultFor(model, codes) {
  const selection = {};
  model.genes.forEach((gene, index) => { selection[gene.id] = model.getGenotype(gene, codes[index]); });
  return model.buildComputedResult(selection);
}

test("score is named a research composite score, not a sensitivity score, on every report surface", () => {
  assert.match(analyzer, /<div class="score-kicker">종합 점수\(연구용 모형\)<\/div>/);
  assert.match(analyzer, /<th>종합 점수<\/th>/);
  assert.match(source, /종합 점수\(연구용 모형\)<\/span><strong class=\\"score-value/);
  assert.match(source, /"종합 점수 \(0-100\)"/);
  for (const [name, text] of [["analyzer", analyzer], ["landing", landing], ["app.js", source]]) {
    assert.doesNotMatch(text, /민감도 (지수|점수)|종합 지수/, name);
  }
});

test("reference position is one coarse 7-section value from the low end, without the N/100 rank", () => {
  const model = loadModel();
  for (const [score, position] of [[0, 1], [6.9, 2], [16.6, 2], [16.7, 3], [50, 4], [50.6, 5], [57.4, 5], [99.9, 7], [100, 7]]) {
    assert.equal(model.calculateReferencePosition(score), position, String(score));
  }
  assert.equal(model.referencePositionText(2), "7개 구간 중 낮은 쪽에서 2번째");
  assert.equal(model.referencePositionText(null), "산출 없음");
  const demo = resultFor(model, ["AA", "GG", "CC", "AT"]);
  assert.equal(demo.referencePosition, 2);
  assert.equal(resultFor(model, ["unknown", "GG", "CC", "AA"]).referencePosition, null);
  assert.doesNotMatch(source, /참조자료 대비 순서|100단위 환산|% 지점|"참조자료 " \+ result\.sensitivityRank/);
  // Stored research schema keeps its historical fields.
  assert.match(source, /rankOutOf100: data\.result\.sensitivityRank/);
  assert.match(source, /percentile: data\.result\.percentile/);
});

test("a score computed with unknown genotypes is flagged as reference-only next to the score", () => {
  const model = loadModel();
  const onlyCore = resultFor(model, ["CC", "unknown", "unknown", "unknown"]);
  assert.equal(onlyCore.score, 100);
  assert.equal(model.partialInputNote(onlyCore), "참고용 · 입력 1/4 (모름 3개 제외)");
  assert.equal(model.partialInputNote(resultFor(model, ["CC", "GG", "CC", "AA"])), "");
  assert.equal(model.partialInputNote(resultFor(model, ["unknown", "GG", "CC", "AA"])), "", "no score, no badge");
  assert.match(analyzer, /<p class="score-partial" id="scorePartialNote" role="note" hidden><\/p>/);
  assert.match(source, /result\.partialInputNote \? "<p class=\\"score-partial\\">"/);
  assert.match(css, /\.score-partial\[hidden\] \{ display: none; \}/);
});
