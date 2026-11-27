"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const source = fs.readFileSync("caffeine-sensitivity-app/workspace.js", "utf8").replace('  window.createAtlasWorkspace =', '  window.readSaved = readRecord;\n  window.createAtlasWorkspace =');
test("saved type labels migrate by their original version", () => {
  let record;
  const window = { localStorage: { getItem: () => JSON.stringify(record) } };
  vm.runInNewContext(source, { window, Number, Array, JSON });
  for (const [version, input, output] of [
    [undefined, "각성형", "저민감형"], [undefined, "잠잠형", "중민감형"], [undefined, "잠꾸러기형", "고민감형"],
    [2, "잠꾸러기형", "저민감형"], [2, "잠잠형", "중민감형"], [2, "각성형", "고민감형"],
    [3, "저민감형", "저민감형"], [3, "정보 부족형", "정보 부족형"]
  ]) {
    record = { id:"test", date:"2026-11-27", genotypes:["AA","GG","CC","AT"], savedAt:1, category:input, categoryVersion:version };
    assert.equal(window.readSaved("test").category, output, `${version} ${input}`);
  }
});
