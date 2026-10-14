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
  assert.doesNotMatch(landing, /href="\.\/assets\/caffeine-atlas-batch-template\.xlsx/);
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

test("cloud storage and batch upload controls remain in DOM but hidden only in public mode", () => {
  assert.match(analyzer, /<div class="input-mode-switch research-only"/);
  assert.match(analyzer, /<label class="consent-card research-only"/);
  assert.match(analyzer, /<section class="batch-panel research-only" id="batchModePanel"/);
  assert.match(analyzer, /<button class="tool-button primary research-only" id="sheetSaveBtn"/);
  assert.match(css, /body\.public-demo \.research-only\s*,\s*body\.research-mode \.public-only\s*\{\s*display:\s*none\s*!important/);
  assert.match(analyzer, /id="sheetConsent"/);
  assert.match(analyzer, /id="batchAnalyzeSaveBtn"/);
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
  assert.match(analyzer, /https:\/\/haru-today\.github\.io\/privacy\.html/);
  assert.match(analyzer, /https:\/\/haru-today\.github\.io\/terms\.html/);
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
  assert.doesNotMatch(source, /대한민국 평균 100명 중|7개의 임의 예시 구간|임의 7구간/);
  assert.match(source, /참조자료 대비 순서/);
  assert.match(source, /전체 인구를 대표하거나 임상적으로 검증된 민감도 순위는 아닙니다/);
  assert.match(landing, /실제 인구집단의 백분위나 개인별 안전 섭취량은 아닙니다/);
});


test("four-SNP coverage is not misrepresented as predictive confidence", () => {
  assert.match(analyzer, /<span>입력 완성도<\/span>/);
  assert.match(analyzer, /예측 정확도·통계적 신뢰도를 의미하지 않습니다/);
  assert.doesNotMatch(analyzer, /<span>신뢰도<\/span>/);
  assert.match(source, /<span>SNP coverage<\/span>/);
  assert.match(source, /<span>입력 완성도<\/span>/);
  assert.doesNotMatch(source, /<span>Confidence<\/span>|<span>신뢰도<\/span>/);
  // Keep historical JSON schema stable; only copy/labels change.
  assert.match(source, /confidence: confidence/);
});
