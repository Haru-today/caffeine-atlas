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
  assert.match(html, /href="\.\/caffeine-sensitivity-app\/index\.html">Caffeine Atlas 서비스 열기<\/a>/);
  assert.doesNotMatch(html, /<title>Personal Health Atlas/);
});

test("public pages stand on their own without LABDAM or REPODAM ties", () => {
  const pages = ["index.html", "privacy.html", "terms.html",
    ...["index.html", "analyzer.html", "board.html", "board-write.html", "account.html"]
      .map(name => path.join("caffeine-sensitivity-app", name))];
  for (const name of pages) {
    const html = fs.readFileSync(name, "utf8");
    assert.doesNotMatch(html, /LABDAM|LabInsight|lab-insight|REPODAM|리포담|Personal Health Atlas/i, name);
    for (const [, href] of html.matchAll(/href="([^"]+)"/g)) {
      const url = new URL(href, "https://haru-today.github.io/caffeine-atlas/" + name.replace(/\\/g, "/"));
      if (url.hostname !== "haru-today.github.io") continue;
      assert.ok(url.pathname.startsWith("/caffeine-atlas/"), `${name} links outside Caffeine Atlas: ${href}`);
    }
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
