"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const { createHmac } = require("node:crypto");

const KEY = "TEST-ONLY-APP-SCRIPT-GATEWAY-KEY-NEVER-DEPLOY";
const DUMMY_SHEET_ID = "EXAMPLE-ONLY-SPREADSHEET-ID-12345678";
const source = fs.readFileSync("google-apps-script/Code.gs", "utf8");

function fixture({ key = KEY } = {}) {
  let reads = 0, writes = 0, locked = false;
  const replay = new Map();
  const sandbox = {
    console: { error() {} },
    ContentService: {
      MimeType: { JSON: "application/json", JAVASCRIPT: "text/javascript" },
      createTextOutput(text) {
        return { text, setMimeType() { return this; } };
      }
    },
    PropertiesService: { getScriptProperties() {
      return { getProperty(name) {
        if (name === "CAFFEINE_ATLAS_WRITE_HMAC_KEY") return key;
        if (name === "CAFFEINE_ATLAS_SHEET_ID") return DUMMY_SHEET_ID;
        return null;
      } };
    } },
    CacheService: { getScriptCache() {
      return {
        get(name) { return replay.get(name) || null; },
        put(name, value) { replay.set(name, value); }
      };
    } },
    Utilities: {
      computeHmacSha256Signature(text, secret) {
        return [...createHmac("sha256", secret).update(text).digest()];
      }
    },
    LockService: { getScriptLock() {
      return { waitLock() {
        assert.equal(locked, false); locked = true;
      }, releaseLock() { locked = false; } };
    } },
    SpreadsheetApp: {
      openById() { reads++; writes++; throw new Error("Should not access Sheets in auth tests"); }
    }
  };
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: "Code.gs" });
  function signedAuth(payload, nonce, timestamp = Math.floor(Date.now() / 1000), signatureKey = KEY) {
    return {
      timestamp,
      nonce,
      signature: createHmac("sha256", signatureKey)
        .update(String(timestamp) + "." + nonce + "." + JSON.stringify(payload)).digest("hex")
    };
  }
  function post(envelope) {
    return JSON.parse(sandbox.doPost({ postData: { contents: JSON.stringify(envelope) } }).text);
  }
  function get(param) {
    return JSON.parse(sandbox.doGet({ parameter: param }).text);
  }
  return { signedAuth, post, get, sandbox, metrics: () => ({ reads, writes, locked }) };
}

test("no signature or browser-supplied consent can authorize writes", () => {
  const x = fixture();
  const row = { requestId: "a".repeat(32), consent: true, sampleId: "SHOULD-NOT-SAVE" };
  assert.equal(x.post(row).code, "AUTH_REQUIRED");
  assert.equal(x.post({ payload: row }).code, "AUTH_REQUIRED");
  assert.equal(x.post({ payload: row, auth: { timestamp: Date.now(), nonce: "abc", signature: "not-signed" } }).code, "AUTH_REQUIRED");
  assert.deepEqual(x.metrics(), { reads: 0, writes: 0, locked: false });
});

test("missing Script Properties key denies even a correctly signed request", () => {
  const x = fixture({ key: null });
  const payload = { action: "setupTemplate" };
  assert.equal(x.post({ payload, auth: x.signedAuth(payload, "1".repeat(32)) }).code, "AUTH_REQUIRED");
  assert.equal(x.metrics().reads, 0);
});

test("a signed request cannot be tampered with", () => {
  const x = fixture();
  const payload = { action: "setupTemplate", requestId: "a".repeat(32) };
  const auth = x.signedAuth(payload, "2".repeat(32));
  assert.equal(x.post({ payload: { ...payload, action: "batchSave" }, auth }).code, "AUTH_REQUIRED");
  assert.equal(x.post({ payload, auth: { ...auth, signature: "f".repeat(64) } }).code, "AUTH_REQUIRED");
  assert.equal(x.metrics().reads, 0);
});

test("expired, future, malformed and repeated nonce are rejected", () => {
  const x = fixture();
  const payload = { action: "setupTemplate" };
  const now = Math.floor(Date.now() / 1000);
  const cases = [
    x.signedAuth(payload, "3".repeat(32), now - 301),
    x.signedAuth(payload, "4".repeat(32), now + 301),
    x.signedAuth(payload, "5".repeat(31), now)
  ];
  for (const auth of cases) {
    assert.equal(x.post({ payload, auth }).code, "AUTH_REQUIRED");
  }
  const auth = x.signedAuth(payload, "6".repeat(32), now);
  assert.equal(x.post({ payload, auth }).code, "ADMIN_ACTION_FORBIDDEN");
  assert.equal(x.post({ payload, auth }).code, "AUTH_REQUIRED");
  assert.equal(x.metrics().reads, 0);
});

test("even signed remote template reset never invokes admin spreadsheet code", () => {
  const x = fixture();
  const payload = { action: "setupTemplate", requestId: "a".repeat(32) };
  assert.equal(x.post({ payload, auth: x.signedAuth(payload, "7".repeat(32)) }).code, "ADMIN_ACTION_FORBIDDEN");
  assert.equal(x.metrics().reads, 0);
});

test("unauthorized GET receipt requests are denied, signed capabilities reveal no sheet ID", () => {
  const x = fixture();
  assert.equal(x.get({ action: "saveStatus", requestId: "a".repeat(32) }).code, "AUTH_REQUIRED");
  assert.equal(x.get({ action: "capabilities" }).code, "AUTH_REQUIRED");
  const auth = x.signedAuth("GET:capabilities:", "8".repeat(32));
  const result = x.get({ action: "capabilities", ...auth });
  assert.equal(result.ok, true);
  assert.equal(result.capabilities.confirmedSave, true);
  assert.equal(JSON.stringify(result).includes("spreadsheetId"), false);
  assert.equal(JSON.stringify(result).includes(DUMMY_SHEET_ID), false);
  assert.equal(x.metrics().reads, 0);
});

test("unknown GET actions, replay and unsigned JSONP are rejected", () => {
  const x = fixture();
  assert.equal(x.get({ action: "setupTemplate" }).code, "AUTH_REQUIRED");
  assert.equal(x.get({ action: "capabilities", callback: "malicious" }).code, "AUTH_REQUIRED");
  const auth = x.signedAuth("GET:saveStatus:" + "f".repeat(32), "9".repeat(32));
  const request = { action: "saveStatus", requestId: "f".repeat(32), ...auth };
  assert.equal(x.get(request).state, "unconfirmed");
  assert.equal(x.get(request).code, "AUTH_REQUIRED");
  assert.equal(x.metrics().reads, 0);
});
