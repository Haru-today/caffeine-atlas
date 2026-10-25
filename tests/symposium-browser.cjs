"use strict";
const { chromium, webkit, devices } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const base = "http://127.0.0.1:8765";
const artifacts = path.join(process.cwd(), "test-artifacts");
fs.mkdirSync(artifacts, { recursive: true });

async function runCase(name, browserType, viewport, deviceOverrides = {}) {
  const browser = await browserType.launch({ headless: true });
  const context = await browser.newContext({
    viewport,
    acceptDownloads: true,
    ...deviceOverrides
  });
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
    if (viewport.width <= 760) {
      assert.ok(landingMetrics.buttonWidth >= 150, name + ": mobile login-free CTA too narrow");
      // Every homepage menu item must be fully on screen and easy to tap, with no hidden scroller.
      const menu = await page.locator(".home-menu a").evaluateAll(links => links.map(a => {
        const r = a.getBoundingClientRect();
        return { text: a.textContent.trim(), left: r.left, right: r.right, height: r.height, visible: r.width > 0 };
      }));
      assert.equal(menu.length, 4, name + ": homepage menu items");
      for (const item of menu) {
        assert.ok(item.visible && item.left >= 0 && item.right <= landingMetrics.viewport + 1, name + ": menu item off screen: " + item.text);
        assert.ok(item.height >= 44, name + ": menu item too small to tap: " + item.text);
      }
    }
    await cta.click();
    await page.waitForURL(/\/caffeine-sensitivity-app\/analyzer\.html$/);
    assert.equal(await page.locator("body.public-demo").count(), 1);

    assert.equal(await page.locator(".public-demo-notice").isVisible(), true);
    assert.equal(await page.locator("#sheetSaveBtn").isVisible(), false);
    assert.equal(await page.locator("#batchModeBtn").isVisible(), false);
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
    }
    assert.equal(await page.locator("#resultReport").isVisible(), true);
    assert.match(await page.locator("#referenceRankText").textContent(), /참조자료 대비 순서/);
    assert.equal(await page.locator(".chart-card .reference-scope-note").isVisible(), true);
    assert.equal(await page.locator(".layer-stack .reference-scope-note").isVisible(), true);
    assert.match(await page.locator(".layer-stack").textContent(), /입력 완성도/);

    // Shared-event-device hygiene: previous demo inputs must be removable.
    await page.locator("#editBtn").click();
    await page.locator("#resetBtn").click();
    assert.equal(await page.locator("#sampleId").inputValue(), "");
    assert.equal(await page.locator(".gt-button.active").count(), 0);

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
    assert.match(content, /전체 한국인 인구를 대표하는 임상 검증 순위/);
    assert.match(content, /SNP coverage/);
    await popup.close();

    assert.deepEqual(outgoing, [], name + ": unapproved Sheets API call observed");
    assert.deepEqual(errors, [], name + ": runtime JavaScript error observed");
    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth > window.innerWidth + 1);
    assert.equal(overflow, false, name + ": horizontal overflow");
    await page.screenshot({ path: path.join(artifacts, name + ".png"), fullPage: true });
    console.log("PASS " + name + " — QR, one-tap fictional demo, safe reset, manual SNP, downloads, PDF and no Sheets calls");
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
