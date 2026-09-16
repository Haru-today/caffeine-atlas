const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const writes = [];
let lastRow = 1;
const cells = [];
const receipts = new Map();
let failWrite = false;
let failReadback = false;
let locked = false;

const sheet = {
  getLastRow() {
    return lastRow;
  },
  appendRow(values) {
    writes.push({ row: lastRow + 1, column: 1, values: [values] });
    lastRow += 1;
  },
  getRange(row, column, rowCount, columnCount) {
    return {
      getValues() {
        assert.equal(locked, true, "reads must hold the write lock");
        if (failReadback && columnCount === 22) return [["mismatch"]];
        return Array.from({ length: rowCount }, (_, i) => Array.from({ length: columnCount }, (_, j) => cells[row + i]?.[column + j] ?? ""));
      },
      setValues(values) {
        if (failWrite && row > 1) throw new Error("write failed");
        values.forEach((valuesRow, i) => {
          cells[row + i] ||= [];
          valuesRow.forEach((value, j) => { cells[row + i][column + j] = value; });
        });
        writes.push({ row, column, rowCount, columnCount, values });
        lastRow = Math.max(lastRow, row + values.length - 1);
        return this;
      },
    };
  },
};

const spreadsheet = {
  setSpreadsheetTimeZone() {},
  getSheetByName() {
    return sheet;
  },
  insertSheet() {
    return sheet;
  },
};

const sandbox = {
  console: { log: console.log, error() {} },
  ContentService: {
    MimeType: { JSON: "application/json" },
    createTextOutput(text) {
      return {
        text,
        setMimeType() {
          return this;
        },
      };
    },
  },
  CacheService: { getScriptCache() { return { get: key => receipts.get(key), put: (key, value) => receipts.set(key, value) }; } },
  SpreadsheetApp: {
    flush() {},
    openById() {
      return spreadsheet;
    },
  },
  LockService: {
    getScriptLock() {
      return { waitLock() { assert.equal(locked, false); locked = true; }, releaseLock() { locked = false; } };
    },
  },
  Utilities: {
    getUuid() {
      return "generated-test-batch";
    },
    formatDate() {
      return "2026-08-04 10:00:00 KST";
    },
  },
};

vm.createContext(sandbox);
vm.runInContext(fs.readFileSync("google-apps-script/Code.gs", "utf8"), sandbox, { filename: "Code.gs" });

const capabilityResponse = sandbox.doGet({ parameter: { callback: "batchCapabilityTest" } });
assert.match(capabilityResponse.text, /^batchCapabilityTest\(/);
assert.match(capabilityResponse.text, /"batchSave":true/);
assert.match(capabilityResponse.text, /"maxBatchRows":200/);

function validRow(sampleId, genotype = "AA") {
  return {
    submittedAt: "2026-08-04 10:00:00 KST",
    sampleId,
    reportDate: "2026-08-04",
    collectionDate: "2026-08-03",
    specimen: "구강상피세포",
    sex: "미기재",
    institution: "테스트 기관",
    rs762551: genotype,
    rs2069514: "GG",
    rs2472297: "CC",
    rs6968865: "AA",
    requestId: "a".repeat(32),
    score: 0,
    category: "각성형",
    metabolismSubtype: "고속 대사형",
    percentile: 0,
    confidence: 100,
    metabolismScore: 0,
    regulationScore: 0,
    consent: true,
    rankOutOf100: 100,
    reportJson: { sampleId },
  };
}

const batchResponse = sandbox.doPost({
  postData: {
    contents: JSON.stringify({
      action: "batchSave",
      requestId: "b".repeat(32),
      batchId: "batch-test-001",
      rows: [validRow("TEST-001"), validRow("TEST-002", "AC")],
    }),
  },
});
const batchJson = JSON.parse(batchResponse.text);
assert.deepEqual(batchJson, {
  ok: true,
  action: "batchSave",
  batchId: "batch-test-001",
  savedCount: 2,
});

const batchWrite = writes.find((write) => write.rowCount === 2);
assert.ok(batchWrite, "two batch rows should be written in one setValues call");
assert.equal(batchWrite.columnCount, 22);
assert.equal(batchWrite.values[0][1], "TEST-001");
assert.equal(batchWrite.values[1][1], "TEST-002");
assert.equal(batchWrite.values[0][21], "batch-test-001");

const exampleResponse = sandbox.doPost({
  postData: {
    contents: JSON.stringify({
      action: "batchSave",
      requestId: "b".repeat(32),
      batchId: "batch-example-skip",
      rows: [validRow("예시-저장안됨"), validRow("TEST-ACTUAL")],
    }),
  },
});
const exampleJson = JSON.parse(exampleResponse.text);
assert.equal(exampleJson.ok, true);
assert.equal(exampleJson.savedCount, 1);
const exampleWrite = writes.find((write) => write.values?.some((row) => row[1] === "TEST-ACTUAL"));
assert.ok(exampleWrite, "actual row should still be written");
assert.equal(exampleWrite.values.some((row) => row[1] === "예시-저장안됨"), false);

const writesBeforeDuplicate = writes.length;
const duplicateResponse = sandbox.doPost({
  postData: {
    contents: JSON.stringify({
      action: "batchSave",
      requestId: "b".repeat(32),
      rows: [validRow("DUPLICATE"), validRow("DUPLICATE")],
    }),
  },
});
const duplicateJson = JSON.parse(duplicateResponse.text);
assert.equal(duplicateJson.ok, false);
assert.match(duplicateJson.message, /Duplicate Sample ID/);
assert.equal(writes.length, writesBeforeDuplicate, "invalid batch must not write partial rows");

const noConsent = validRow("NO-CONSENT");
noConsent.consent = false;
const noConsentResponse = sandbox.doPost({
  postData: { contents: JSON.stringify(noConsent) },
});
assert.equal(JSON.parse(noConsentResponse.text).ok, false);

console.log("Google Apps Script batch tests passed");

function post(payload) {
  return JSON.parse(sandbox.doPost({ postData: { contents: JSON.stringify(payload) } }).text);
}
function status(requestId) {
  return JSON.parse(sandbox.doGet({ parameter: { action: "saveStatus", requestId } }).text);
}
assert.equal(status("a".repeat(32)).state, "error");
assert.equal(post(validRow(" UNIQUE ")).ok, true);
assert.deepEqual(status("a".repeat(32)), { ok: true, state: "saved", savedCount: 1 });
let before = lastRow;
assert.equal(post(validRow("UNIQUE")).ok, false);
assert.equal(lastRow, before);
assert.equal(status("a".repeat(32)).code, "DUPLICATE_SAMPLE_ID");
assert.equal(post({ action: "batchSave", requestId: "c".repeat(32), rows: [validRow("NEW"), validRow("TEST-001")] }).ok, false);
assert.equal(lastRow, before, "existing ID must block the entire batch");
for (const genotype of ["GG", "TG", "GT"]) {
  assert.equal(post({ ...validRow("INVALID-" + genotype), rs6968865: genotype }).ok, false);
}
for (const genotype of ["AA", "AT", "TT", "모름"]) {
  assert.equal(post({ ...validRow("AHR-" + genotype), rs6968865: genotype }).ok, true);
}
assert.equal(post(validRow("__proto__")).ok, true);
assert.equal(post(validRow("__proto__")).ok, false);
failWrite = true;
assert.equal(post(validRow("FAIL-WRITE")).ok, false);
assert.equal(status("a".repeat(32)).state, "error");
failWrite = false;
failReadback = true;
assert.equal(post(validRow("FAIL-READBACK")).ok, false);
assert.equal(status("a".repeat(32)).state, "error");
failReadback = false;
assert.equal(status("f".repeat(32)).state, "unconfirmed");
assert.equal(status("bad").state, "unconfirmed");
assert.equal(locked, false);
console.log("Global duplicates, allele validation, and confirmed-write tests passed");
