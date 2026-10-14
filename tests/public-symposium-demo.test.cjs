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
  assert.match(analyzer, /리포트는 기기에 직접 내려받을 수 있습니다/);
  assert.match(analyzer, /연구·교육용 해석 리포트이며 질병 진단/);
  assert.match(analyzer, /https:\/\/haru-today\.github\.io\/privacy\.html/);
  assert.match(analyzer, /https:\/\/haru-today\.github\.io\/terms\.html/);
});
