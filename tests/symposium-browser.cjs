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
    await cta.click();
    await page.waitForURL(/\/caffeine-sensitivity-app\/analyzer\.html$/);
    assert.equal(await page.locator("body.public-demo").count(), 1);

    assert.equal(await page.locator(".public-demo-notice").isVisible(), true);
    assert.equal(await page.locator("#sheetSaveBtn").isVisible(), false);
    assert.equal(await page.locator("#batchModeBtn").isVisible(), false);
    assert.equal(await page.locator("#sheetConsent").isVisible(), false);

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
    await popup.close();

    assert.deepEqual(outgoing, [], name + ": unapproved Sheets API call observed");
    assert.deepEqual(errors, [], name + ": runtime JavaScript error observed");
    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth > window.innerWidth + 1);
    assert.equal(overflow, false, name + ": horizontal overflow");
    await page.screenshot({ path: path.join(artifacts, name + ".png"), fullPage: true });
    console.log("PASS " + name + " — QR route, public 4-SNP analyzer, downloadable report and PDF popup");
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
