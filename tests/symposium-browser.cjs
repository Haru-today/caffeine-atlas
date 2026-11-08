"use strict";
const { chromium, webkit } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const XLSX = require("../caffeine-sensitivity-app/vendor/xlsx.full.min.js");

const base = process.env.CAFFEINE_TEST_BASE_URL || "http://127.0.0.1:8765";
const artifacts = process.env.CAFFEINE_TEST_ARTIFACTS_DIR || path.join(process.cwd(), "test-artifacts");
fs.mkdirSync(artifacts, { recursive: true });

async function serveLocalFiles(context) {
  const root = path.resolve(__dirname, "..");
  const mime = {
    ".html": "text/html; charset=utf-8", ".js": "application/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8", ".png": "image/png", ".svg": "image/svg+xml",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  };
  // Render the real static files without a network listener on restricted PCs.
  await context.route("**/*", async route => {
    const url = new URL(route.request().url());
    if (url.protocol === "blob:") return route.continue();
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
    await page.goto(base + "/", { waitUntil: "domcontentloaded" });
    await page.waitForURL(/\/caffeine-sensitivity-app\/index\.html$/, { timeout: 15000 });
    const cta = page.getByRole("link", { name: /로그인 없이 체험 시작/ });
    assert.equal(await cta.count(), 1, name + ": missing public demo CTA");
    // Landing stays public and the mobile primary action must be easy to tap.
    const landingMetrics = await page.evaluate(() => {
      const cta = [...document.querySelectorAll("a")].find(a => a.textContent.includes("로그인 없이 체험 시작"));
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
    await page.locator(".home-types").scrollIntoViewIfNeeded();
    await page.waitForFunction(() => [...document.querySelectorAll(".type-art img")].every(img => img.complete && img.naturalWidth === 2172));
    for (const key of ["awake", "calm", "sleepy"]) {
      assert.equal(await page.locator(".home-types .type-art--" + key).count(), 1);
    }
    await page.locator(".home-types").screenshot({ path: path.join(artifacts, name + "-characters.png") });
    await page.evaluate(() => window.scrollTo(0, 0));
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
      assert.equal(menu.length, 4, name + ": homepage menu items");
      for (const item of menu) {
        assert.ok(item.visible && item.clickable, name + ": menu item hidden or covered: " + item.text);
        assert.ok(item.left >= 0 && item.right <= landingMetrics.viewport + 1, name + ": menu item off screen: " + item.text);
        assert.ok(item.height >= 44, name + ": menu item too small to tap: " + item.text);
      }
    }
    await cta.click();
    await page.waitForURL(/\/caffeine-sensitivity-app\/analyzer\.html$/);
    assert.equal(await page.locator("body.public-demo").count(), 1);

    assert.equal(await page.locator(".public-demo-notice").isVisible(), true);
    assert.equal(await page.locator("#sheetSaveBtn").isVisible(), false);
    assert.equal(await page.locator("#batchModeBtn").isVisible(), true);
    assert.equal(await page.locator("#sheetConsent").isVisible(), false);

    // The poster audience generally has no personal genotyping data.
    // Explicit, fictional one-tap example must produce a full report.
    assert.equal(await page.locator("#exampleDemoBtn").isVisible(), true);
    await page.locator("#exampleDemoBtn").click();
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
    assert.equal(await page.locator("#typeIllustration .type-art--awake").isVisible(), true);
    await page.waitForFunction(() => document.querySelector("#typeIllustration img")?.naturalWidth === 2172);
    assert.match(await page.locator("#referenceRankText").textContent(), /참조자료 대비 순서/);
    assert.equal(await page.locator(".chart-card .reference-scope-note").isVisible(), true);
    assert.equal(await page.locator(".layer-stack .reference-scope-note").isVisible(), true);
    assert.match(await page.locator(".layer-stack").textContent(), /입력 완성도/);

    // Shared-event-device hygiene: previous demo inputs must be removable.
    await page.locator("#editBtn").click();
    await page.locator("#resetBtn").click();
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
    const savedHtml = fs.readFileSync(await download.path(), "utf8");
    assert.match(savedHtml, /DEMO-001/);
    assert.match(savedHtml, /type-art--awake/);
    assert.match(savedHtml, /class="saved-chart-image"/);
    assert.doesNotMatch(savedHtml, /id="editBtn"|id="pdfBtn"|id="copyBtn"/);
    await page.evaluate(() => Object.defineProperty(navigator, "clipboard", { configurable: true,
      value: { writeText: async text => { window.copiedTestReport = text; } } }));
    await page.locator("#copyBtn").click();
    assert.match(await page.evaluate(() => window.copiedTestReport), /Sample ID: DEMO-001/);
    assert.match(await page.evaluate(() => window.copiedTestReport), /유형: 각성형/);

    const popupWait = page.waitForEvent("popup");
    await page.locator("#pdfBtn").click();
    const popup = await popupWait;
    await popup.waitForLoadState("domcontentloaded");
    const content = await popup.locator("body").textContent();
    assert.match(content, /DEMO-001/);
    assert.match(content, /rs6968865|AHR/);
    assert.match(content, /연구 참조분포/);
    assert.match(content, /전체 한국인 인구를 대표하는 임상 검증 순위/);
    assert.match(content, /SNP coverage/);
    await popup.close();

    // Exercise every single-person type and unknown-marker transitions in the UI.
    for (const [label, values] of [
      ["잠잠형", ["AC", "AG", "CT", "AT"]],
      ["잠꾸러기형", ["CC", "AG", "TT", "TT"]],
      ["정보 부족형", ["unknown", "GG", "CC", "AT"]]
    ]) {
      await page.locator("#editBtn").click();
      for (const [index, rsid] of ["rs762551", "rs2069514", "rs2472297", "rs6968865"].entries()) {
        await page.locator('[data-gene="' + rsid + '"][data-genotype="' + values[index] + '"]').click();
      }
      await page.locator("#analyzeBtn").click();
      assert.equal(await page.locator("#typeName").textContent(), label);
      assert.equal(await page.locator("#typeIllustration").isVisible(), label !== "정보 부족형");
      if (label === "정보 부족형") assert.equal(await page.locator("#scoreValue").textContent(), "--");
    }
    await page.locator("#editBtn").click();
    await page.locator("#sampleId").fill("");
    await page.locator("#analyzeBtn").click();
    assert.match(await page.locator("#validationText").textContent(), /Sample ID를 입력/);
    assert.equal(await page.locator("#resultReport").isVisible(), false);
    await page.locator("#sampleId").fill("VALIDATION-TEST");
    await page.locator("#collectionDate").fill("2099-12-31");
    await page.locator("#analyzeBtn").click();
    assert.match(await page.locator("#validationText").textContent(), /채취일은 리포트 날짜보다 늦을 수 없습니다/);

    // Local batch processing must work on the public QR URL with no Sheets consent.
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
    XLSX.utils.sheet_add_aoa(templateBook.Sheets["일괄 입력"], [
      ["0001", "2026-11-08", "2026-11-07", "구강상피세포", "미기재", "AA", "GG", "CC", "AT"],
      ["PDF-SECOND", "2026-11-09", "2026-11-07", "타액", "미기재", "CC", "AG", "TT", "TT"],
      ["PDF-HOLD", "2026-11-08", "", "구강상피세포", "미기재", "모름", "GG", "CC", "AT"],
      ["PDF-CALM", "2026-11-09", "", "구강상피세포", "미기재", "AC", "AG", "CT", "AT"],
      ["DEMO-ERROR", "2026-11-08", "", "구강상피세포", "미기재", "AA", "GG", "CC", "GG"]
    ], { origin: "A3" });
    await page.locator("#batchFile").setInputFiles({
      name: "fictional-batch.xlsx",
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      buffer: Buffer.from(XLSX.write(templateBook, { type: "buffer", bookType: "xlsx" }))
    });
    await page.locator("#batchAnalyzeBtn").click();
    await page.waitForFunction(() => document.querySelectorAll("#batchResultsBody tr").length === 5);
    assert.match(await page.locator("#batchResultsBody").textContent(), /0001/);
    assert.match(await page.locator("#batchResultsBody").textContent(), /DEMO-ERROR/);
    assert.equal(await page.locator("#batchDownloadBtn").isEnabled(), true);
    assert.match(await page.locator("#batchResultCounts").textContent(), /분석 완료 3명/);
    assert.match(await page.locator("#batchResultCounts").textContent(), /판정 보류 1명/);
    assert.match(await page.locator("#batchResultCounts").textContent(), /수정 필요 1명/);
    assert.equal(await page.locator("#batchResults").evaluate(element => element === document.activeElement), true);
    for (const sampleId of ["0001", "PDF-SECOND", "PDF-HOLD", "PDF-CALM"]) {
      const button = page.getByRole("button", { name: sampleId + " PDF 저장 화면 열기", exact: true });
      assert.equal(await button.isEnabled(), true);
      const pdfWait = page.waitForEvent("popup");
      await button.click();
      const pdf = await pdfWait;
      await pdf.bringToFront();
      await pdf.waitForLoadState("domcontentloaded");
      assert.match(await pdf.title(), new RegExp("Caffeine-Atlas-Report-" + sampleId));
      const body = await pdf.locator("body").textContent();
      assert.ok(body.includes(sampleId));
      for (const other of ["DEMO-001", "PDF-SECOND", "PDF-HOLD", "PDF-CALM", "DEMO-ERROR"]) {
        if (other !== sampleId) assert.equal(body.includes(other), false, "PDF must contain only its own subject");
      }
      if (sampleId === "PDF-HOLD") {
        assert.equal(await pdf.locator(".gauge.is-unscored").count(), 1);
        assert.equal(await pdf.locator(".distribution-marker").count(), 0);
        assert.equal(await pdf.locator(".type-art").count(), 0);
      } else {
        const key = { "0001": "awake", "PDF-SECOND": "sleepy", "PDF-CALM": "calm" }[sampleId];
        const label = { awake: "각성형", calm: "잠잠형", sleepy: "잠꾸러기형" }[key];
        assert.equal(await pdf.locator(".type-panel h2").textContent(), label);
        assert.equal(await pdf.locator(".type-art--" + key).count(), 1);
        await pdf.waitForFunction(() => document.querySelector(".type-art img")?.naturalWidth === 2172, null, { timeout: 10000 }).catch(async error => {
          console.error("PDF image diagnostic", await pdf.locator("img").evaluateAll(images => images.map(img => ({ src: img.src, complete: img.complete, width: img.naturalWidth }))));
          throw error;
        });
        if (viewport.width > 760) {
          await pdf.screenshot({ path: path.join(artifacts, name + "-pdf-" + key + ".png"), fullPage: true });
        }
      }
      await pdf.close();
    }
    assert.equal(await page.getByRole("button", { name: "DEMO-ERROR PDF 저장 화면 열기", exact: true }).isEnabled(), false);
    const batchDownloadWait = page.waitForEvent("download");
    await page.locator("#batchDownloadBtn").click();
    const batchDownload = await batchDownloadWait;
    assert.match(batchDownload.suggestedFilename(), /\.xlsx$/);
    const resultBook = XLSX.read(fs.readFileSync(await batchDownload.path()), { type: "buffer" });
    for (const sheetName of ["분석 결과", "입력 오류", "해석 안내"]) assert.ok(resultBook.Sheets[sheetName], sheetName);
    const rows = XLSX.utils.sheet_to_json(resultBook.Sheets["분석 결과"], { header: 1, defval: "" });
    assert.equal(rows.length, 6);
    assert.ok(rows.some(row => row.includes("0001")), "leading-zero Sample ID must survive download");
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
    await page.locator("#batchAnalyzeBtn").click();
    await page.waitForFunction(() => document.getElementById("batchStatus").classList.contains("error"));
    assert.equal(await page.locator("#batchResults").isVisible(), false);
    assert.equal(await page.locator("#batchDownloadBtn").isEnabled(), false);
    await page.locator("#batchClearBtn").click();
    assert.equal(await page.locator("#batchFile").evaluate(input => input.files.length), 0);
    assert.equal(await page.locator("#batchResultsBody").textContent(), "");
    assert.equal(await page.locator("[data-batch-pdf-row]").count(), 0);
    assert.equal(await page.locator("#batchAnalyzeBtn").isEnabled(), false);
    assert.equal(await page.locator("#batchClearBtn").isEnabled(), false);
    assert.equal(await page.locator("#batchFile").evaluate(input => input === document.activeElement), true);

    // Support pages expose real search and a mail draft, without sending mail.
    await page.goto(base + "/caffeine-sensitivity-app/board.html");
    await page.locator("#boardSearch").fill("없는 검색어 TEST-NONE");
    assert.equal(await page.locator(".board-row:visible").count(), 0);
    assert.match(await page.locator("#boardSearchStatus").textContent(), /검색 결과가 없습니다/);
    await page.locator("#boardSearch").fill("리포트");
    assert.equal(await page.locator(".board-row:visible").count(), 1);
    await page.goto(base + "/caffeine-sensitivity-app/board-write.html");
    assert.equal(await page.locator("form").evaluate(form => form.checkValidity()), false);
    await page.locator('[name="author"]').fill("가상 기능 점검");
    await page.locator('[name="title"]').fill("메일 발송 없는 점검");
    await page.locator('[name="content"]').fill("가상 내용");
    assert.equal(await page.locator("form").evaluate(form => form.checkValidity()), true);
    await page.getByRole("button", { name: "초기화", exact: true }).click();
    assert.equal(await page.locator('[name="author"]').inputValue(), "");
    await page.goto(base + "/caffeine-sensitivity-app/account.html");
    assert.equal(await page.getByRole("heading", { name: "회원가입 없이 이용하세요" }).isVisible(), true);
    assert.equal(await page.locator('input:visible').count(), 0);
    for (const policy of ["privacy.html", "terms.html"]) {
      const response = await page.goto(base + "/" + policy);
      assert.equal(response.status(), 200);
      assert.equal(await page.locator("h1").count(), 1);
    }
    await page.goto(base + "/caffeine-sensitivity-app/analyzer.html#batch");
    assert.equal(await page.locator("#batchModePanel").isVisible(), true);
    assert.equal(await page.locator("#batchResults").isVisible(), false);

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
