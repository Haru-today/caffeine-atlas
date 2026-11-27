"use strict";
const { chromium, webkit } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const XLSX = require("../caffeine-sensitivity-app/vendor/xlsx.full.min.js");
const JSZip = require("../caffeine-sensitivity-app/vendor/jszip.min.js");
const { PDFDocument, PageSizes } = require("../caffeine-sensitivity-app/vendor/pdf-lib.min.js");

const base = process.env.CAFFEINE_TEST_BASE_URL || "http://127.0.0.1:8765";
const artifacts = process.env.CAFFEINE_TEST_ARTIFACTS_DIR || path.join(process.cwd(), "test-artifacts");
fs.mkdirSync(artifacts, { recursive: true });

async function serveLocalFiles(context) {
  const root = path.resolve(__dirname, "..");
  const mime = {
    ".html": "text/html; charset=utf-8", ".js": "application/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8", ".png": "image/png", ".webp": "image/webp", ".svg": "image/svg+xml",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  };
  // Render the real static files without a network listener on restricted PCs.
  await context.route("**/*", async route => {
    const url = new URL(route.request().url());
    if (url.origin !== new URL(base).origin) return route.abort();
    try {
      let file = path.resolve(root, "." + decodeURIComponent(url.pathname));
      if (file !== root && !file.startsWith(root + path.sep)) return route.abort();
      if (fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
      await route.fulfill({ status: 200, body: fs.readFileSync(file),
        contentType: mime[path.extname(file)] || "application/octet-stream" });
    } catch (_) {
      await route.fulfill({ status: 404, body: "Not found" });
    }
  });
}

async function runCase(name, browserType, viewport, deviceOverrides = {}) {
  const browser = await browserType.launch({ headless: true });
  const context = await browser.newContext({
    viewport,
    acceptDownloads: true,
    ...deviceOverrides
  });
  if (process.env.CAFFEINE_TEST_OFFLINE === "1") await serveLocalFiles(context);
  const page = await context.newPage();
  const errors = [];
  const outgoing = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("request", req => {
    if (/script\.google\.com\/macros|\/api\/caffeine-atlas/.test(req.url())) {
      outgoing.push(req.url());
    }
  });

  try {
    const examples = [["1", "저민감형"], ["low", "저민감형"], ["calm", "중민감형"], ["mid", "중민감형"], ["awake", "고민감형"], ["high", "고민감형"], ["sleepy", "고민감형"]];
    for (const [alias, type] of examples) {
      await page.goto(base + "/caffeine-sensitivity-app/analyzer.html?example=" + alias, { waitUntil: "domcontentloaded" });
      assert.equal(await page.locator("#typeName").textContent(), type, alias);
      if (["low", "mid", "high"].includes(alias)) {
        const previewWait = page.waitForEvent("popup");
        await page.locator("#pdfBtn").click();
        const preview = await previewWait;
        await preview.waitForLoadState("domcontentloaded");
        assert.match(await preview.locator(".type-panel").textContent(), new RegExp(type));
        assert.match(await preview.locator("body").textContent(), /민감도 반영 점수/);
        await preview.close();
      }
    }
    await page.goto(base + "/", { waitUntil: "domcontentloaded" });
    await page.waitForURL(/\/caffeine-sensitivity-app\/index\.html$/, { timeout: 15000 });
    const cta = page.locator(".home-hero").getByRole("link", { name: "체험 시작", exact: true });
    assert.equal(await cta.count(), 1, name + ": missing public demo CTA");
    // Landing stays public and the mobile primary action must be easy to tap.
    const landingMetrics = await page.evaluate(() => {
      const cta = document.querySelector(".home-hero .home-button");
      const rect = cta?.getBoundingClientRect();
      return {
        scroll: document.documentElement.scrollWidth,
        viewport: document.documentElement.clientWidth,
        buttonWidth: rect?.width || 0,
        buttonHeight: rect?.height || 0
      };
    });
    assert.ok(landingMetrics.scroll <= landingMetrics.viewport + 1, name + ": landing horizontal overflow");
    assert.ok(landingMetrics.buttonHeight >= 46, name + ": login-free CTA too small");
    if (viewport.width <= 760) {
      assert.ok(landingMetrics.buttonWidth >= 150, name + ": mobile login-free CTA too narrow");
      // Every homepage menu item must be fully on screen and easy to tap, with no hidden scroller.
      const menu = await page.locator(".home-menu a").evaluateAll(links => links.map(a => {
        const r = a.getBoundingClientRect();
        const style = getComputedStyle(a);
        const hit = document.elementFromPoint((r.left + r.right) / 2, (r.top + r.bottom) / 2);
        return {
          text: a.textContent.trim(), left: r.left, right: r.right, height: r.height,
          visible: r.width > 0 && style.visibility === "visible" && style.pointerEvents !== "none",
          clickable: !!hit && (hit === a || a.contains(hit))
        };
      }));
      assert.equal(menu.length, 5, name + ": homepage menu items");
      for (const item of menu) {
        assert.ok(item.visible && item.clickable, name + ": menu item hidden or covered: " + item.text);
        assert.ok(item.left >= 0 && item.right <= landingMetrics.viewport + 1, name + ": menu item off screen: " + item.text);
        assert.ok(item.height >= 44, name + ": menu item too small to tap: " + item.text);
      }
    }
    await page.getByRole("button", { name: "다음 배너", exact: true }).click();
    assert.equal(await page.locator("#home-types-banner-title").isVisible(), true, name + ": next home banner");
    await page.getByRole("button", { name: "내 리포트 배너", exact: true }).click();
    assert.equal(await page.locator("#home-reports-banner-title").isVisible(), true, name + ": selectable home banner");
    await page.getByRole("button", { name: "유전자형 체험 배너", exact: true }).press("Enter");
    await cta.click();
    await page.waitForURL(/\/caffeine-sensitivity-app\/analyzer\.html$/);
    assert.equal(await page.locator("body.public-demo").count(), 1);
    assert.equal(await page.locator("#collectionDate").inputValue(), "");

    assert.equal(await page.locator(".public-demo-notice").isVisible(), true);
    assert.equal(await page.locator("#sheetSaveBtn").isVisible(), false);
    assert.equal(await page.locator("#batchModeBtn").isVisible(), true);
    assert.equal(await page.locator("#sheetConsent").isVisible(), false);

    // The poster audience generally has no personal genotyping data.
    // Explicit, fictional one-tap example must produce a full report.
    assert.equal(await page.locator("#exampleDemoBtn").isVisible(), true);
    const analyzerLayout = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
      viewportHeight: window.innerHeight,
      exampleBottom: document.querySelector("#exampleDemoBtn").getBoundingClientRect().bottom,
      singleTop: document.querySelector("#singleModeBtn").getBoundingClientRect().top,
      batchTop: document.querySelector("#batchModeBtn").getBoundingClientRect().top
    }));
    assert.ok(analyzerLayout.scrollWidth <= analyzerLayout.viewportWidth + 1, name + ": analyzer horizontal overflow");
    assert.ok(analyzerLayout.exampleBottom <= analyzerLayout.viewportHeight, name + ": example CTA below the first screen");
    assert.equal(analyzerLayout.singleTop, analyzerLayout.batchTop, name + ": input modes should appear together");
    await page.locator("#exampleDemoBtn").click();
    const scoreRange = await page.locator("#atlas-method-score").evaluate(card => {
      const { paddingLeft, paddingRight } = getComputedStyle(card);
      const track = card.querySelector(".gauge-track").getBoundingClientRect();
      const labels = [...card.querySelectorAll(".gauge-scale span")];
      return {
        width: track.width,
        available: card.clientWidth - parseFloat(paddingLeft) - parseFloat(paddingRight),
        alignedLabels: labels.length === 3 && labels.every(label => getComputedStyle(label).textAlign === "center" && label.scrollWidth <= label.clientWidth)
      };
    });
    assert.ok(Math.abs(scoreRange.width - scoreRange.available) <= 1, name + ": score range should fill the card");
    assert.ok(scoreRange.alignedLabels, name + ": score range labels should fit their segments");
    assert.equal(await page.locator(".atlas-snp").count(), 4);
    await page.locator('.atlas-report-nav a[href="#report-genotypes"]').click();
    await page.waitForURL(/#report-genotypes$/);
    const marker = page.locator("#report-metabolism-snps").locator("details").first();
    assert.equal(await marker.getAttribute("open"), null);
    await marker.locator("summary").click();
    assert.match(await marker.locator(".atlas-snp-body").innerText(), /결과에 반영되는 비중\s*카페인 분해 영역 중 82%/);
    await page.locator("#atlas-snp-sort").selectOption("highest");
    assert.deepEqual(await page.locator('[data-report-layer="behavior"] > details').evaluateAll(items => items.map(item => Number(item.dataset.points))), [50, 0]);
    await page.locator("#atlas-snp-sort").selectOption("lowest");
    assert.deepEqual(await page.locator('[data-report-layer="behavior"] > details').evaluateAll(items => items.map(item => Number(item.dataset.points))), [0, 50]);
    await page.locator("#atlas-snp-sort").selectOption("default");

    assert.equal(await page.locator("#sampleId").inputValue(), "DEMO-001");
    for (const [gene, genotype] of [
      ["rs762551", "AA"], ["rs2069514", "GG"],
      ["rs2472297", "CC"], ["rs6968865", "AT"]
    ]) {
      assert.equal(await page.locator('[data-gene="' + gene + '"][data-genotype="' + genotype + '"]').getAttribute("class")
        .then(classes => classes.includes("active")), true, gene);
      assert.equal(await page.locator('[data-gene="' + gene + '"][data-genotype="' + genotype + '"]').getAttribute("aria-pressed"), "true", gene);
    }
    assert.equal(await page.locator("#resultReport").isVisible(), true);
    assert.equal(await page.locator("#referencePositionText").textContent(), "내 점수 이하: 20.6% (350명 기준)");
    assert.match(await page.locator("#reportMeta").textContent(), /Collection date: 미기재/);
    assert.equal(await page.locator("#scoreCoverageNote").isVisible(), false);
    assert.equal(await page.locator(".chart-card .reference-scope-note").isVisible(), true);
    assert.equal(await page.locator(".layer-stack .reference-scope-note").isVisible(), true);
    assert.match(await page.locator(".layer-stack").textContent(), /확인된 유전자/);

    // Shared-event-device hygiene: previous demo inputs must be removable.
    await page.locator("#editBtn").click();
    if (!(await page.locator("#specimenDetails").evaluate(details => details.open))) {
      await page.locator("#specimenDetails summary").click();
    }
    await page.locator("#collectionDate").fill("2026-11-07");
    await page.locator("#resetBtn").click();
    assert.equal(await page.locator("#collectionDate").inputValue(), "");
    assert.equal(await page.locator("#sampleId").inputValue(), "");
    assert.equal(await page.locator(".gt-button.active").count(), 0);
    assert.equal(await page.locator('.gt-button[aria-pressed="true"]').count(), 0);

    // The original manual 4-SNP input and PDF flow also remain functional.
    await page.locator("#sampleId").fill("DEMO-001");
    for (const [gene, genotype] of [
      ["rs762551", "AA"],
      ["rs2069514", "GG"],
      ["rs2472297", "CC"],
      ["rs6968865", "AT"]
    ]) {
      await page.locator('[data-gene="' + gene + '"][data-genotype="' + genotype + '"]').click();
    }
    await page.locator("#analyzeBtn").click();
    assert.equal(await page.locator("#resultReport").isVisible(), true);
    assert.equal(await page.locator("#resultContent").isVisible(), true);
    assert.equal(await page.locator("#saveBtn").isVisible(), true);
    assert.equal(await page.locator("#pdfBtn").isVisible(), true);

    const downloadWait = page.waitForEvent("download");
    await page.locator("#saveBtn").click();
    const download = await downloadWait;
    assert.match(download.suggestedFilename(), /Caffeine-Atlas|Report|DEMO-001/i);

    const popupWait = page.waitForEvent("popup");
    await page.locator("#pdfBtn").click();
    const popup = await popupWait;
    await popup.waitForLoadState("domcontentloaded");
    const content = await popup.locator("body").textContent();
    assert.match(content, /DEMO-001/);
    assert.match(content, /rs6968865|AHR/);
    assert.match(content, /연구 참조분포/);
    assert.match(content, /내 점수 이하: 20\.6% \(350명 기준\)/);
    assert.match(content, /같은 방법으로 계산한 연구 참조자료 350명/);
    assert.doesNotMatch(content, /95\/100/);
    assert.match(content, /확인된 유전자/);
    await popup.close();

    await page.locator("#editBtn").click();
    await page.locator('[data-gene="rs6968865"][data-genotype="unknown"]').click();
    await page.locator("#analyzeBtn").click();
    assert.equal(await page.locator("#scoreCoverageNote").textContent(), "제한적 결과 · 확인된 유전자 4개 중 3개");

    await page.locator("#editBtn").click();
    await page.locator('[data-gene="rs6968865"][data-genotype="AT"]').click();
    await page.locator('[data-gene="rs762551"][data-genotype="unknown"]').click();
    await page.locator("#analyzeBtn").click();
    assert.equal(await page.locator("#referencePositionText").textContent(), "핵심 유전자를 확인하지 못해 위치를 표시하지 않아요.");
    assert.match(await page.locator("#detailInputQuality").textContent(), /확인 3개/);
    assert.equal(await page.locator("#scoreCoverageNote").isVisible(), false);

    // Local batch processing must work on the public QR URL with no Sheets consent.
    await page.locator("#editBtn").click();
    await page.locator("#batchModeBtn").click();
    assert.equal(await page.locator("#batchModePanel").isVisible(), true);
    assert.equal(await page.locator("#batchConsent").isVisible(), false);
    assert.equal(await page.locator("#batchAnalyzeSaveBtn").isVisible(), false);
    assert.equal(await page.locator("#batchClearBtn").isEnabled(), false);
    await page.locator("#batchModeBtn").press("Home");
    assert.equal(await page.locator("#singleModeBtn").getAttribute("aria-selected"), "true");
    await page.locator("#singleModeBtn").press("End");
    assert.equal(await page.locator("#batchModeBtn").getAttribute("aria-selected"), "true");
    const templateLink = page.getByRole("link", { name: /엑셀 양식 다운로드/ });
    let templateBytes;
    if (process.env.CAFFEINE_TEST_OFFLINE === "1") {
      // A browser-managed HTTP download requires network access even when the
      // page itself is routed. Read the exact linked asset for offline QA.
      const href = await templateLink.getAttribute("href");
      assert.match(href, /^\.\/assets\/caffeine-atlas-batch-template\.xlsx/);
      templateBytes = fs.readFileSync(path.resolve(__dirname, "../caffeine-sensitivity-app/assets/caffeine-atlas-batch-template.xlsx"));
    } else {
      const templateWait = page.waitForEvent("download");
      await templateLink.click();
      templateBytes = fs.readFileSync(await (await templateWait).path());
    }
    const templateBook = XLSX.read(templateBytes, { type: "buffer" });
    assert.ok(templateBook.Sheets["일괄 입력"]);
    const subjects = [
      ["0001", "2026-11-08", "2026-11-07", "구강상피세포", "미기재", "AA", "GG", "CC", "AT"],
      ["PDF-SECOND", "2026-11-09", "2026-11-07", "타액", "미기재", "CC", "AG", "TT", "TT"],
      ["PDF-HOLD", "2026-11-08", "", "구강상피세포", "미기재", "모름", "GG", "CC", "AT"],
      ["PDF-MID", "2026-11-08", "", "구강상피세포", "미기재", "AC", "AG", "CT", "AT"]
    ];
    if (viewport.width > 760) {
      for (let index = 0; index < 47; index++) {
        const sampleId = ["검체/A", "검체?A"][index] || "ZIP-SAMPLE-" + (index + 1);
        subjects.push([sampleId, "2026-11-09", "", "타액", "미기재", "AC", "AG", "CT", "AT"]);
      }
    }
    XLSX.utils.sheet_add_aoa(templateBook.Sheets["일괄 입력"], subjects.concat([
      ["DEMO-ERROR", "2026-11-08", "", "구강상피세포", "미기재", "AA", "GG", "CC", "GG"]
    ]), { origin: "A3" });
    await page.locator("#batchFile").setInputFiles({
      name: "fictional-batch.xlsx",
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      buffer: Buffer.from(XLSX.write(templateBook, { type: "buffer", bookType: "xlsx" }))
    });
    await page.locator("#batchAnalyzeBtn").click();
    await page.waitForFunction(count => document.querySelectorAll("#batchResultsBody tr").length === count, subjects.length + 1);
    assert.match(await page.locator("#batchResultsBody").textContent(), /0001/);
    assert.match(await page.locator("#batchResultsBody").textContent(), /DEMO-ERROR/);
    assert.equal(await page.locator("#batchDownloadBtn").isEnabled(), true);
    for (const sampleId of ["0001", "PDF-SECOND", "PDF-HOLD", "PDF-MID"]) {
      const button = page.getByRole("button", { name: sampleId + " PDF 저장 화면 열기", exact: true });
      assert.equal(await button.isEnabled(), true);
      const pdfWait = page.waitForEvent("popup");
      await button.click();
      const pdf = await pdfWait;
      await pdf.waitForLoadState("domcontentloaded");
      assert.match(await pdf.title(), new RegExp("Caffeine-Atlas-Report-" + sampleId));
      const body = await pdf.locator("body").textContent();
      assert.ok(body.includes(sampleId));
      for (const other of ["DEMO-001", "PDF-SECOND", "PDF-HOLD", "DEMO-ERROR"]) {
        if (other !== sampleId) assert.equal(body.includes(other), false, "PDF must contain only its own subject");
      }
      if (sampleId === "PDF-HOLD") {
        assert.equal(await pdf.locator(".gauge.is-unscored").count(), 1);
        assert.equal(await pdf.locator(".distribution-marker").count(), 0);
      }
      await pdf.close();
    }
    assert.equal(await page.getByRole("button", { name: "DEMO-ERROR PDF 저장 화면 열기", exact: true }).isEnabled(), false);
    const zipButton = page.locator("#batchPdfZipBtn");
    assert.equal(await zipButton.isEnabled(), true);
    const tabCount = context.pages().length;
    const zipWait = page.waitForEvent("download", { timeout: 120000 });
    await zipButton.click();
    const zipDownload = await zipWait;
    assert.match(zipDownload.suggestedFilename(), /^Caffeine-Atlas-Batch-PDF-\d+\.zip$/);
    assert.equal(context.pages().length, tabCount, "ZIP export must not open tabs");
    const zip = await JSZip.loadAsync(fs.readFileSync(await zipDownload.path()), { checkCRC32: true });
    assert.equal(Object.keys(zip.files).length, subjects.length);
    const titles = [];
    for (const entry of Object.values(zip.files)) {
      assert.match(entry.name, /\.pdf$/);
      assert.doesNotMatch(entry.name, /DEMO-ERROR/);
      const doc = await PDFDocument.load(await entry.async("uint8array"));
      assert.equal(doc.getPageCount(), 1);
      assert.deepEqual([doc.getPage(0).getWidth(), doc.getPage(0).getHeight()], PageSizes.A4);
      titles.push(doc.getTitle());
    }
    assert.deepEqual(titles, subjects.map(([sampleId]) => "Caffeine Atlas Report - " + sampleId));
    assert.equal(await zipButton.isEnabled(), true);
    assert.equal(await page.locator('iframe[aria-hidden="true"]').count(), 0);

    const batchDownloadWait = page.waitForEvent("download");
    await page.locator("#batchDownloadBtn").click();
    const batchDownload = await batchDownloadWait;
    assert.match(batchDownload.suggestedFilename(), /\.xlsx$/);
    const resultBook = XLSX.read(fs.readFileSync(await batchDownload.path()), { type: "buffer" });
    for (const sheetName of ["분석 결과", "입력 오류", "해석 안내"]) assert.ok(resultBook.Sheets[sheetName], sheetName);
    const rows = XLSX.utils.sheet_to_json(resultBook.Sheets["분석 결과"], { header: 1, defval: "" });
    assert.equal(rows.length, subjects.length + 2);
    assert.ok(rows.some(row => row.includes("0001")), "leading-zero Sample ID must survive download");
    for (const [sampleId, type] of [["0001", "저민감형"], ["PDF-MID", "중민감형"], ["PDF-SECOND", "고민감형"]]) {
      const row = rows.find(values => values.includes(sampleId));
      assert.ok(row && row.includes(type), sampleId + " spreadsheet type");
    }
    assert.match(JSON.stringify(XLSX.utils.sheet_to_json(resultBook.Sheets["입력 오류"], { header: 1 })), /DEMO-ERROR/);

    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth > window.innerWidth + 1);
    assert.equal(overflow, false, name + ": horizontal overflow");
    await page.screenshot({ path: path.join(artifacts, name + ".png"), fullPage: true });

    // A failed replacement must not offer the previous visitor's results.
    const invalidBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(invalidBook, XLSX.utils.aoa_to_sheet([["wrong input"]]), "잘못된 시트");
    await page.locator("#batchFile").setInputFiles({
      name: "wrong-sheet.xlsx",
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      buffer: Buffer.from(XLSX.write(invalidBook, { type: "buffer", bookType: "xlsx" }))
    });
    assert.equal(await page.locator("#batchDownloadBtn").isEnabled(), false);
    assert.equal(await zipButton.isEnabled(), false);
    await page.locator("#batchAnalyzeBtn").click();
    await page.waitForFunction(() => document.getElementById("batchStatus").classList.contains("error"));
    assert.equal(await page.locator("#batchResults").isVisible(), false);
    assert.equal(await page.locator("#batchDownloadBtn").isEnabled(), false);
    assert.equal(await zipButton.isEnabled(), false);
    await page.locator("#batchClearBtn").click();
    assert.equal(await page.locator("#batchFile").evaluate(input => input.files.length), 0);
    assert.equal(await page.locator("#batchResultsBody").textContent(), "");
    assert.equal(await page.locator("[data-batch-pdf-row]").count(), 0);
    assert.equal(await page.locator("#batchAnalyzeBtn").isEnabled(), false);
    assert.equal(await page.locator("#batchClearBtn").isEnabled(), false);
    assert.equal(await page.locator("#batchFile").evaluate(input => input === document.activeElement), true);

    assert.deepEqual(outgoing, [], name + ": unapproved Sheets API call observed");
    assert.deepEqual(errors, [], name + ": runtime JavaScript error observed");
    console.log("PASS " + name + " — QR, demo, individual/batch PDF, batch import/export, invalid replacement, clear and no Sheets calls");
  } catch (error) {
    try { await page.screenshot({ path: path.join(artifacts, name + "-failure.png"), fullPage: true }); } catch (_) {}
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }
}

(async () => {
  await runCase("mobile-320-chromium", chromium, { width: 320, height: 720 },
    { isMobile: true, hasTouch: true });
  await runCase("mobile-iphone-webkit", webkit, { width: 375, height: 812 },
    { isMobile: true, hasTouch: true });
  await runCase("desktop-chromium", chromium, { width: 1440, height: 900 });
})().catch(error => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
