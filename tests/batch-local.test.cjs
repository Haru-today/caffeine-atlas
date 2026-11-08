"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const XLSX = require("../caffeine-sensitivity-app/vendor/xlsx.full.min.js");

const source = fs.readFileSync("caffeine-sensitivity-app/app.js", "utf8");
const window = { XLSX };
vm.runInNewContext(source.replace("  init();", `
  window.batchTest = {
    genes, BATCH_HEADERS, parseBatchWorkbook, analyzeBatchRow, buildComputedResult,
    normalizeGenotype, normalizeSpecimen, normalizeSex, normalizeBatchDate,
    buildBatchResultWorkbook
  };`), { window, document: { getElementById() { return {}; } }, console });
const app = window.batchTest;

function row(sampleId, genotypes = ["AA", "GG", "CC", "AT"]) {
  return [sampleId, "2026-11-08", "2026-11-07", "구강상피세포", "미기재", ...genotypes];
}
function workbook(rows, headers = app.BATCH_HEADERS) {
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([headers, ...rows]), "일괄 입력");
  return book;
}
function file(book, options = {}) {
  const buffer = XLSX.write(book, { type: "buffer", bookType: "xlsx" });
  return {
    name: "batch.xlsx", size: buffer.length,
    async arrayBuffer() { return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength); },
    ...options
  };
}
function toRows(sheet) {
  return XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: "" });
}

function selectionFor(codes) {
  return Object.fromEntries(app.genes.map((gene, index) => [gene.id,
    gene.genotypes.find(genotype => genotype.code === codes[index])]));
}

test("the same character type can have different model metabolism directions", () => {
  const fast = app.buildComputedResult(selectionFor(["AA", "AA", "TT", "TT"]));
  const slow = app.buildComputedResult(selectionFor(["CC", "GG", "CC", "AA"]));
  assert.equal(fast.category.label, "잠잠형");
  assert.equal(slow.category.label, "잠잠형");
  assert.equal(fast.metabolismSubtype.name, "빠른 분해 쪽(모형)");
  assert.equal(slow.metabolismSubtype.name, "느린 분해 쪽(모형)");
  for (const result of [fast, slow]) {
    assert.match(result.metabolismSubtype.desc, /실제 분해 속도를 확인한 결과는 아니에요/);
  }
});

test("missing core and partial metabolism inputs keep their uncertainty visible", () => {
  const held = app.buildComputedResult(selectionFor(["unknown", "AA", "TT", "TT"]));
  assert.equal(held.metabolismSubtype.name, "판정 보류");
  assert.doesNotMatch(held.metabolismSubtype.name + held.metabolismSubtype.desc, /빠른 분해 쪽|느린 분해 쪽/);
  const partial = app.buildComputedResult(selectionFor(["AA", "unknown", "unknown", "unknown"]));
  assert.equal(partial.confidence, 25);
  assert.match(partial.metabolismSubtype.desc, /분해 관련 2개 항목 중 1개만 확인/);
});

function localFlowHarness() {
  const objects = new Map();
  const downloads = [];
  const popups = [];
  const alerts = [];
  let popupBlocked = false;
  const reportUrls = new Map();
  class ReportURL extends URL {}
  ReportURL.createObjectURL = blob => { const url = "blob:test-" + reportUrls.size; reportUrls.set(url, blob.html); return url; };
  ReportURL.revokeObjectURL = url => reportUrls.delete(url);
  class ReportBlob { constructor(parts) { this.html = parts.join(""); } }
  let networkCalls = 0;
  const failNetwork = () => { networkCalls++; throw new Error("local batch must not use the network"); };
  const localWindow = { XLSX: { ...XLSX, writeFile(book, name) { downloads.push({ book, name }); } }, fetch: failNetwork };
  localWindow.location = { href: "https://example.test/caffeine-atlas/caffeine-sensitivity-app/analyzer.html" };
  localWindow.open = url => {
    if (popupBlocked) return null;
    popups.push(reportUrls.get(url));
    return {};
  };
  localWindow.alert = message => alerts.push(message);
  const localDocument = { getElementById(id) {
    if (!objects.has(id)) objects.set(id, {
      hidden: true, disabled: false, checked: false, innerHTML: "", textContent: "", files: [],
      classList: { toggle() {} }
    });
    return objects.get(id);
  }, createElement: failNetwork };
  vm.runInNewContext(source.replace("  init();", `
    window.flow = {
      choose: function(file) { elements.batchFile.files = file ? [file] : []; handleBatchFileChange(); },
      run: processLocalBatchUpload,
      download: downloadBatchResults,
      pdf: saveBatchPdfReport,
      snapshot: function() { return { busy: batchBusy, records: batchResults.slice() }; }
    };`), { window: localWindow, document: localDocument, fetch: failNetwork, URL: ReportURL, Blob: ReportBlob, console });
  return { ...localWindow.flow, element: id => objects.get(id), downloads, popups, alerts,
    blockPopup(value) { popupBlocked = value; }, networkCalls: () => networkCalls };
}

test("each batch PDF uses its own ID, dates, genotypes and held result", async () => {
  const flow = localFlowHarness();
  const second = row("PDF-SECOND", ["CC", "AG", "TT", "TT"]);
  second[1] = "2026-11-09";
  flow.choose(file(workbook([
    row("PDF-FIRST"), second, row("PDF-HOLD", ["모름", "GG", "CC", "AT"])
  ])));
  await flow.run();
  flow.pdf(2);
  flow.pdf(3);
  flow.pdf(4);
  assert.equal(flow.popups.length, 3);
  assert.match(flow.popups[0], /<title>Caffeine-Atlas-Report-PDF-FIRST-2026-11-08<\/title>/);
  assert.doesNotMatch(flow.popups[0], /PDF-SECOND|PDF-HOLD/);
  assert.match(flow.popups[1], /<title>Caffeine-Atlas-Report-PDF-SECOND-2026-11-09<\/title>/);
  assert.doesNotMatch(flow.popups[1], /PDF-FIRST|PDF-HOLD/);
  assert.match(flow.popups[1], /<td>CC<\/td>/);
  assert.match(flow.popups[2], /gauge is-unscored/);
  assert.doesNotMatch(flow.popups[2], /<circle class="distribution-marker"/);
  assert.equal(flow.networkCalls(), 0);
});

test("batch PDF rejects invalid or stale rows and recovers from popup blocking", async () => {
  const flow = localFlowHarness();
  flow.choose(file(workbook([row("PDF-VALID"), row("PDF-INVALID", ["GG", "GG", "CC", "AT"])])));
  await flow.run();
  flow.pdf(3);
  flow.pdf(NaN);
  assert.equal(flow.popups.length, 0);
  flow.blockPopup(true);
  flow.pdf(2);
  assert.match(flow.alerts[0], /팝업 차단/);
  assert.equal(flow.snapshot().records.length, 2);
  flow.blockPopup(false);
  flow.pdf(2);
  assert.equal(flow.popups.length, 1);
  flow.choose(file(workbook([row("PDF-REPLACEMENT")])));
  flow.pdf(2);
  assert.equal(flow.popups.length, 1, "old rows must be unavailable before replacement is analyzed");
  await flow.run();
  flow.pdf(2);
  assert.equal(flow.popups.length, 2);
  assert.match(flow.popups[1], /PDF-REPLACEMENT/);
  assert.doesNotMatch(flow.popups[1], /PDF-VALID/);
  assert.equal(flow.networkCalls(), 0);
});

test("PDF and Excel carry the same plain explanation for every direction and hold", async () => {
  const flow = localFlowHarness();
  flow.choose(file(workbook([
    row("EASY-FAST"), row("EASY-MIDDLE", ["AC", "AG", "CT", "AT"]),
    row("EASY-SLOW", ["CC", "AG", "TT", "TT"]), row("EASY-HOLD", ["모름", "AA", "TT", "TT"])
  ])));
  await flow.run();
  flow.download();
  const output = toRows(flow.downloads[0].book.Sheets["분석 결과"]);
  const directionColumn = output[0].indexOf("분해 방향(모형)");
  const interpretationColumn = output[0].indexOf("해석");
  const names = ["빠른 분해 쪽(모형)", "중간 구간(모형)", "느린 분해 쪽(모형)", "판정 보류"];
  names.forEach((name, index) => {
    flow.pdf(index + 2);
    assert.ok(flow.popups[index].includes(name));
    assert.equal(output[index + 1][directionColumn], name);
    assert.ok(flow.popups[index].includes(flow.snapshot().records[index].result.metabolismSubtype.desc));
    assert.ok(output[index + 1][interpretationColumn].includes(flow.snapshot().records[index].result.metabolismSubtype.desc));
  });
  assert.doesNotMatch(flow.popups[3], /빠른 분해 쪽|느린 분해 쪽/);
  assert.equal(flow.networkCalls(), 0);
});

test("public local analysis renders mixed rows and clears stale downloads after a failed reupload", async () => {
  const flow = localFlowHarness();
  flow.choose(file(workbook([row("LOCAL-VALID"), row("LOCAL-INVALID", ["GG", "GG", "CC", "AT"])])));
  assert.equal(flow.element("batchAnalyzeBtn").disabled, false);
  assert.equal(flow.element("batchDownloadBtn").disabled, true);
  await flow.run();
  assert.equal(flow.element("batchResults").hidden, false);
  assert.equal(flow.element("batchDownloadBtn").disabled, false);
  assert.match(flow.element("batchResultsBody").innerHTML, /LOCAL-VALID/);
  assert.match(flow.element("batchResultsBody").innerHTML, /LOCAL-INVALID/);
  assert.match(flow.element("batchResultsBody").innerHTML, /분석 완료/);
  assert.match(flow.element("batchResultsBody").innerHTML, /입력 오류/);
  assert.equal(flow.snapshot().records.length, 2);
  flow.download();
  assert.equal(flow.downloads.length, 1);
  assert.equal(toRows(flow.downloads[0].book.Sheets["분석 결과"]).length, 3);

  const wrongBook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wrongBook, XLSX.utils.aoa_to_sheet([["wrong input"]]), "잘못된 시트");
  flow.choose(file(wrongBook));
  assert.equal(flow.snapshot().records.length, 0);
  assert.equal(flow.element("batchResults").hidden, true);
  assert.equal(flow.element("batchDownloadBtn").disabled, true);
  await flow.run();
  assert.match(flow.element("batchStatus").textContent, /시트를 찾을 수 없습니다/);
  assert.equal(flow.snapshot().records.length, 0);
  assert.equal(flow.element("batchResults").hidden, true);
  assert.equal(flow.element("batchDownloadBtn").disabled, true);
  flow.download();
  assert.equal(flow.downloads.length, 1, "failed upload must not export the previous subjects");

  flow.choose(file(workbook([row("LOCAL-RETRY")])));
  await flow.run();
  assert.equal(flow.snapshot().records.length, 1);
  assert.match(flow.element("batchResultsBody").innerHTML, /LOCAL-RETRY/);
  assert.doesNotMatch(flow.element("batchResultsBody").innerHTML, /LOCAL-VALID|LOCAL-INVALID/);
  assert.equal(flow.networkCalls(), 0);
});

test("local batch busy state blocks duplicate processing and downloads until the file read completes", async () => {
  const flow = localFlowHarness();
  const fixture = file(workbook([row("BUSY-TEST")]));
  const buffer = await fixture.arrayBuffer();
  let completeRead;
  let reads = 0;
  flow.choose({ ...fixture, arrayBuffer() {
    reads++;
    return new Promise(resolve => { completeRead = resolve; });
  } });
  const first = flow.run();
  assert.equal(flow.snapshot().busy, true);
  for (const id of ["batchFile", "batchAnalyzeBtn", "batchAnalyzeSaveBtn", "batchDownloadBtn"]) {
    assert.equal(flow.element(id).disabled, true, id);
  }
  await flow.run();
  assert.equal(reads, 1, "second click must not start another workbook read");
  flow.download();
  assert.equal(flow.downloads.length, 0);
  completeRead(buffer);
  await first;
  assert.equal(flow.snapshot().busy, false);
  assert.equal(flow.element("batchFile").disabled, false);
  assert.equal(flow.element("batchAnalyzeBtn").disabled, false);
  assert.equal(flow.element("batchDownloadBtn").disabled, false);
  assert.equal(flow.snapshot().records.length, 1);
  assert.equal(flow.networkCalls(), 0);
});

test("the downloadable template parses fictional rows without including its example", async () => {
  const template = XLSX.read(fs.readFileSync("caffeine-sensitivity-app/assets/caffeine-atlas-batch-template.xlsx"), { type: "buffer" });
  const sheet = template.Sheets["일괄 입력"];
  assert.ok(sheet, "template must contain the input sheet");
  const headers = toRows(sheet)[0];
  for (const header of app.BATCH_HEADERS) assert.ok(headers.includes(header), header);
  XLSX.utils.sheet_add_aoa(sheet, [row("TEMPLATE-001")], { origin: "A3" });
  const parsed = await app.parseBatchWorkbook(file(template));
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].sampleId, "TEMPLATE-001");
  assert.equal(parsed[0].errors.length, 0);
});

test("batch and individual calculations agree for complete, partial and unknown genotypes", async () => {
  const records = await app.parseBatchWorkbook(file(workbook([
    row("COMPLETE"), row("PARTIAL", ["AC", "모름", "CT", "모름"]),
    row("NO-CORE", ["모름", "AG", "CT", "AT"]),
    row("UNKNOWN", ["모름", "모름", "모름", "모름"])
  ])));
  for (const record of records) {
    assert.equal(record.errors.length, 0, record.sampleId);
    const result = app.analyzeBatchRow(record);
    const individual = app.buildComputedResult(record.selectionMap);
    assert.equal(result.result.score, individual.score);
    assert.equal(result.reportData.result.category, individual.category.label);
    assert.equal(result.reportData.genotypes.length, 4);
  }
  assert.equal(records[0].result.confidence, 100);
  assert.equal(records[0].payload.consent, false, "local analysis must not imply consent to server storage");
  assert.equal(records[1].result.confidence, 50);
  assert.equal(records[2].result.score, null);
  assert.equal(records[3].result.score, null);
  assert.equal(records[3].result.confidence, 0);
});

test("the separate research batch action attaches consent only after the checked storage control", async () => {
  const researchWindow = { XLSX, location: { href: "https://example.test/caffeine-atlas/caffeine-sensitivity-app/analyzer.html" } };
  const objects = new Map();
  const researchDocument = { getElementById(id) {
    if (!objects.has(id)) objects.set(id, {
      hidden: true, disabled: false, checked: false, innerHTML: "", textContent: "",
      classList: { toggle() {} }
    });
    return objects.get(id);
  } };
  const researchSource = source
    .replace("var RESEARCH_STORAGE_MODE = false;", "var RESEARCH_STORAGE_MODE = true;")
    .replace('var GOOGLE_SHEETS_ENDPOINT = "";', 'var GOOGLE_SHEETS_ENDPOINT = "/test-only-research-endpoint";')
    .replace("  init();", `
      saveConfirmedPayload = function(payload, count) { window.captured = { payload, count }; return Promise.resolve(); };
      window.startBatch = function(file) { batchFile = file; processBatchUpload(); };`);
  vm.runInNewContext(researchSource, { window: researchWindow, document: researchDocument, URL, console });
  const inputFile = file(workbook([row("RESEARCH-TEST")]));
  researchWindow.startBatch(inputFile);
  await new Promise(setImmediate);
  assert.equal(researchWindow.captured, undefined, "unchecked storage consent must prevent transport");
  objects.get("batchConsent").checked = true;
  researchWindow.startBatch(inputFile);
  await new Promise(setImmediate);
  assert.ok(researchWindow.captured, "checked research action should reach confirmed-save transport");
  assert.equal(researchWindow.captured.count, 1);
  assert.equal(researchWindow.captured.payload.rows[0].consent, true);
});

test("all occurrences of duplicate Sample IDs are marked and numeric zero is retained", async () => {
  const records = await app.parseBatchWorkbook(file(workbook([row("DUP"), row(" DUP "), row(0)])));
  assert.equal(records.length, 3);
  for (const record of records.slice(0, 2)) assert.ok(record.errors.some(error => /중복/.test(error)), record.sampleId);
  assert.equal(records[2].sampleId, "0");
  assert.equal(records[2].errors.length, 0);
});

test("Excel text and explicitly formatted numeric Sample IDs preserve leading zeroes", async () => {
  const book = workbook([row("0001"), row(2)]);
  book.Sheets["일괄 입력"].A3 = { t: "n", v: 2, z: "0000" };
  const records = await app.parseBatchWorkbook(file(book));
  assert.deepEqual(Array.from(records, record => record.sampleId), ["0001", "0002"]);
});

test("dates reject invalid calendar values and collection after report", async () => {
  const invalidDate = row("BAD-DATE");
  invalidDate[1] = "2026-02-30";
  const reversed = row("REVERSED-DATE");
  reversed[2] = "2026-11-09";
  const records = await app.parseBatchWorkbook(file(workbook([invalidDate, reversed])));
  for (const record of records) assert.ok(record.errors.length > 0, record.sampleId);
  assert.equal(app.normalizeBatchDate("2024-02-29", true), "2024-02-29");
  assert.equal(app.normalizeBatchDate("2026-02-29", true), null);
});

test("headers, formulas, oversized files and excess rows fail visibly", async () => {
  const duplicateHeaders = Array.from(app.BATCH_HEADERS);
  duplicateHeaders.push("Sample ID");
  await assert.rejects(app.parseBatchWorkbook(file(workbook([row("DUP-HEADER")], duplicateHeaders))), /중복|duplicate/i);
  const formulaBook = workbook([row("FORMULA")]);
  formulaBook.Sheets["일괄 입력"].F2 = { t: "s", f: '"AA"', v: "AA" };
  let formulaRejected = false;
  try {
    const records = await app.parseBatchWorkbook(file(formulaBook));
    formulaRejected = records.some(record => record.errors.some(error => /수식|formula/i.test(error)));
  } catch (error) { formulaRejected = /수식|formula/i.test(error.message); }
  assert.ok(formulaRejected, "cached formula values must not be silently interpreted as source genotypes");
  await assert.rejects(app.parseBatchWorkbook(file(workbook([row("TOO-LARGE")]), {
    size: 5 * 1024 * 1024 + 1,
    async arrayBuffer() { throw new Error("must reject size before reading"); }
  })), /5\s*MB|용량|크기/);
  await assert.rejects(app.parseBatchWorkbook(file(workbook(Array.from({ length: 201 }, (_, i) => row("ID-" + i))))), /200/);
});

test("only supported allele separators and enumerated metadata values are accepted", () => {
  const ahr = app.genes.find(gene => gene.id === "rs6968865");
  for (const value of ["AT", "TA", "A/T", "T|A", " a t "]) assert.equal(app.normalizeGenotype(ahr, value).code, "AT", value);
  for (const value of ["GG", "GT", "A-A", "A_A", "A//T", "A/T/T"]) assert.equal(app.normalizeGenotype(ahr, value), null, value);
  for (const value of ["constructor", "__proto__", "prototype", "invalid"]) {
    assert.equal(app.normalizeSpecimen(value), null, value);
    assert.equal(app.normalizeSex(value), null, value);
  }
});

test("a renamed workbook processes the full 200-person limit without losing rows", async () => {
  const input = Array.from({ length: 200 }, (_, index) => row("LIMIT-" + String(index + 1).padStart(3, "0")));
  const records = await app.parseBatchWorkbook(file(workbook(input), { name: "최종 결과_파일명 변경.xlsx" }));
  assert.equal(records.length, 200);
  records.forEach(record => { assert.equal(record.errors.length, 0); app.analyzeBatchRow(record); });
  const exported = app.buildBatchResultWorkbook(records);
  const saved = XLSX.read(XLSX.write(exported, { type: "buffer", bookType: "xlsx" }), { type: "buffer" });
  const output = toRows(saved.Sheets["분석 결과"]);
  assert.equal(output.length, 201);
  for (const source of input) assert.equal(output.filter(row => row.includes(source[0])).length, 1);
});

test("download workbook retains every row, source values, errors and safe text cells", async () => {
  const bad = row("INVALID-ALLELE", ["GG", "GG", "CC", "AT"]);
  const records = (await app.parseBatchWorkbook(file(workbook([
    row("=HYPERLINK(\"https://example.invalid\")"), bad,
    row("NO-CORE", ["모름", "GG", "CC", "AT"])
  ])))).map(app.analyzeBatchRow);
  const exported = app.buildBatchResultWorkbook(records);
  for (const sheetName of ["분석 결과", "입력 오류", "해석 안내"]) assert.ok(exported.Sheets[sheetName], sheetName);
  const resultRows = toRows(exported.Sheets["분석 결과"]);
  assert.equal(resultRows.length, records.length + 1, "each uploaded row must be represented");
  const flattened = JSON.stringify(resultRows);
  for (const id of records.map(record => record.sampleId)) assert.ok(resultRows.some(row => row.includes(id)), id);
  assert.match(flattened, /GG/);
  assert.match(JSON.stringify(toRows(exported.Sheets["입력 오류"])), /INVALID-ALLELE/);
  const parsedAgain = XLSX.read(XLSX.write(exported, { type: "buffer", bookType: "xlsx" }), { type: "buffer" });
  for (const [address, cell] of Object.entries(parsedAgain.Sheets["분석 결과"])) {
    if (address.startsWith("!")) continue;
    assert.equal(cell.f, undefined, "download must not turn user-supplied text into formulas");
  }
});

test("all 256 combinations produce finite bounded scores or an explicit core-marker hold", () => {
  let count = 0;
  function visit(index, selections) {
    if (index === app.genes.length) {
      const result = app.buildComputedResult(selections);
      assert.ok(Number.isFinite(result.confidence));
      assert.ok(result.confidence >= 0 && result.confidence <= 100);
      if (selections.rs762551.code === "unknown") assert.equal(result.score, null);
      else assert.ok(Number.isFinite(result.score) && result.score >= 0 && result.score <= 100);
      assert.equal(result.valid.length * 25, result.confidence);
      count++;
      return;
    }
    const gene = app.genes[index];
    for (const genotype of gene.genotypes) visit(index + 1, { ...selections, [gene.id]: genotype });
  }
  visit(0, {});
  assert.equal(count, 256);
});
