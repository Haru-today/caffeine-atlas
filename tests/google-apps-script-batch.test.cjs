const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const writes = [];
let lastRow = 1;

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
      setValues(values) {
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
  SpreadsheetApp: {
    openById() {
      return spreadsheet;
    },
  },
  LockService: {
    getScriptLock() {
      return { waitLock() {}, releaseLock() {} };
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
    rs6968865: "GG",
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
