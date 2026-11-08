"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

test("every static page's local links, anchors and resources resolve", () => {
  const pages = fs.readdirSync("caffeine-sensitivity-app").filter(name => name.endsWith(".html"))
    .map(name => "caffeine-sensitivity-app/" + name).concat(["index.html", "privacy.html", "terms.html"]);
  let checked = 0;
  for (const page of pages) {
    const html = fs.readFileSync(page, "utf8");
    for (const script of html.matchAll(/<script(\s[^>]*)?>([\s\S]*?)<\/script>/g)) {
      if (!script[2].trim()) continue;
      if ((script[1] || "").includes("application/ld+json")) JSON.parse(script[2]);
      else new vm.Script(script[2], { filename: page });
    }
    for (const match of html.matchAll(/(?:href|src)="([^"<>]+)"/g)) {
      const href = match[1].replace(/&amp;/g, "&");
      if (/^(?:mailto:|tel:|data:|javascript:)/.test(href) || href.includes("${")) continue;
      const url = new URL(href, "https://atlas.test/" + page);
      let file;
      if (url.hostname === "atlas.test") file = decodeURIComponent(url.pathname).slice(1);
      else if (["haru-today.github.io", "labdam.kr"].includes(url.hostname) && url.pathname.startsWith("/caffeine-atlas/")) {
        file = decodeURIComponent(url.pathname).slice("/caffeine-atlas/".length);
      } else continue;
      file = file || "index.html";
      if (file.endsWith("/")) file += "index.html";
      assert.ok(path.resolve(file).startsWith(process.cwd() + path.sep), page + ": path escaped repository");
      assert.ok(fs.existsSync(file), page + ": missing " + href);
      if (url.hash && file.endsWith(".html")) {
        // The analyzer explicitly treats #batch as a mode route in init().
        if (file === "caffeine-sensitivity-app/analyzer.html" && url.hash === "#batch") continue;
        const target = fs.readFileSync(file, "utf8");
        assert.ok(target.includes('id="' + decodeURIComponent(url.hash.slice(1)) + '"'), page + ": missing anchor " + href);
      }
      checked++;
    }
  }
  assert.ok(checked > 50);
});

test("inquiry form creates an encoded mail draft without posting or sending", () => {
  const html = fs.readFileSync("caffeine-sensitivity-app/board-write.html", "utf8");
  const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)][0][1];
  let submit;
  const values = { category: "피드백", author: "가상 & 점검", title: "질문? A/T", email: "test@example.invalid", phone: "", content: "첫 줄\n둘째 줄 & 확인" };
  const window = { location: { href: "" } };
  vm.runInNewContext(script, {
    window,
    document: { querySelector() { return { addEventListener(event, handler) { assert.equal(event, "submit"); submit = handler; } }; } },
    FormData: class { get(key) { return values[key]; } }
  });
  let prevented = false;
  submit({ preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  const mail = new URL(window.location.href);
  assert.equal(mail.protocol, "mailto:");
  assert.equal(mail.pathname, "20221600@office.deu.ac.kr");
  assert.equal(mail.searchParams.get("subject"), "[Caffeine Atlas 피드백] 질문? A/T");
  assert.ok(mail.searchParams.get("body").includes("첫 줄\n둘째 줄 & 확인"));
  assert.ok(mail.searchParams.get("body").includes("작성자: 가상 & 점검"));
});
