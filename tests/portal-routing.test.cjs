"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("Caffeine Atlas root is service entry, not a fourth integrated portal", () => {
  const html = fs.readFileSync("index.html", "utf8");
  assert.match(html, /<title>Caffeine Atlas/);
  assert.match(html, /http-equiv="refresh" content="0; url=\.\/caffeine-sensitivity-app\/index\.html"/);
  assert.match(html, /rel="canonical" href="https:\/\/haru-today\.github\.io\/caffeine-atlas\/caffeine-sensitivity-app\/index\.html"/);
  assert.match(html, /href="https:\/\/haru-today\.github\.io\/">LABDAM 통합 포털<\/a>/);
  assert.doesNotMatch(html, /<title>Personal Health Atlas/);
});

test("every Caffeine Atlas app page has navigation to LABDAM, not an extra portal", () => {
  const pages = ["index.html", "analyzer.html", "board.html", "board-write.html", "account.html"];
  for (const name of pages) {
    const html = fs.readFileSync(path.join("caffeine-sensitivity-app", name), "utf8");
    assert.match(html, /href="https:\/\/haru-today\.github\.io\/" aria-label="LABDAM 통합 포털로 이동"/, name);
    assert.match(html, /portal-link-badge" aria-hidden="true">LAB</, name);
    assert.doesNotMatch(html, /Personal Health Atlas 통합 포털로 이동/, name);
  }
});

test("existing research and report engine remain in original service directory", () => {
  for (const filename of [
    "caffeine-sensitivity-app/app.js",
    "caffeine-sensitivity-app/analyzer.html",
    "caffeine-sensitivity-app/assets/caffeine-atlas-logo.svg",
    "google-apps-script/Code.gs"
  ]) assert.ok(fs.existsSync(filename), filename);
});
