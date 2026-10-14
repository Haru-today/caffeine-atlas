"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const appDir = path.join(__dirname, "..", "caffeine-sensitivity-app");

test("all Caffeine Atlas pages link to LABDAM privacy and service notices", () => {
  for (const page of ["index.html", "analyzer.html", "account.html", "board.html", "board-write.html"]) {
    const html = fs.readFileSync(path.join(appDir, page), "utf8");
    assert.match(html, /href="https:\/\/haru-today\.github\.io\/privacy\.html"/, page);
    assert.match(html, /href="https:\/\/haru-today\.github\.io\/terms\.html"/, page);
    assert.match(html, /styles\.css\?v=privacy-notice-20261013/, page);
  }
});

test("genetic cloud storage consent discloses actual data fields and unknown retention", () => {
  const html = fs.readFileSync(path.join(appDir, "analyzer.html"), "utf8");
  assert.match(html, /Google Apps Script\/Google Sheets/);
  assert.match(html, /전체 리포트 JSON/);
  assert.match(html, /확정 보관기간·삭제절차/);
  assert.match(html, /식별 가능한 실제 검체 데이터를 저장하지 마세요/);
  assert.match(html, /batchConsent/);
  assert.match(html, /sheetConsent/);
});

test("report metadata escapes adversarial Sample ID before injecting markup", () => {
  const objects = new Map();
  const document = {
    getElementById(id) {
      if (!objects.has(id)) objects.set(id, { value: "", selectedIndex: 0, options: [{ text: "예시" }], innerHTML: "" });
      return objects.get(id);
    }
  };
  document.getElementById("sampleId").value = '<img src=x onerror=alert(1)>';
  const window = {};
  const context = { window, document, console };
  const src = fs.readFileSync(path.join(appDir, "app.js"), "utf8");
  assert.match(src, /  init\(\);\s*\}\(\)\);/);
  vm.runInNewContext(src.replace("  init();", "  window.__privacyTest = { updateReportMeta };"), context);
  window.__privacyTest.updateReportMeta();
  const markup = document.getElementById("reportMeta").innerHTML;
  assert.doesNotMatch(markup, /<img src=x/);
  assert.match(markup, /&lt;img src=x onerror=alert\(1\)&gt;/);
});

test("consent remains a separate check before server storage", () => {
  const src = fs.readFileSync(path.join(appDir, "app.js"), "utf8");
  assert.match(src, /if \(!elements\.sheetConsent\.checked\)/);
  assert.match(src, /if \(!elements\.batchConsent\.checked\)/);
  assert.doesNotMatch(src, /https:\/\/script\.google\.com\/macros\//);
  assert.match(src, /var RESEARCH_STORAGE_MODE = false;/);
  assert.match(src, /var GOOGLE_SHEETS_ENDPOINT = "";/);
});
