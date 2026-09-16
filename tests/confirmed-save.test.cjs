const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');

function app(responses, transportFails = false) {
  let posts = 0;
  const window = { crypto: webcrypto, clearTimeout() {}, setTimeout(fn, ms) { if (ms === 1500) queueMicrotask(fn); return 1; } };
  const document = {
    getElementById() { return {}; },
    createElement() { return {}; },
    head: { appendChild(script) {
      const url = new URL(script.src);
      const response = responses.shift();
      queueMicrotask(() => window[url.searchParams.get('callback')](response));
    } }
  };
  const sandbox = { window, document, AbortController, Uint8Array, console,
    fetch: async (_, options) => {
      posts++;
      assert.match(JSON.parse(options.body).requestId, /^[a-f0-9]{32}$/);
      if (transportFails) throw new Error('transport failed');
      return { type: 'opaque' };
    }
  };
  vm.createContext(sandbox);
  const source = fs.readFileSync('caffeine-sensitivity-app/app.js', 'utf8').replace('  init();',
    '  window.test = { genes: genes, normalizeGenotype: normalizeGenotype, save: saveConfirmedPayload };');
  vm.runInContext(source, sandbox);
  return { ...window.test, posts: () => posts };
}
const capabilities = { ok: true, capabilities: { batchSave: true, confirmedSave: true, globalSampleIdCheck: true, ahrAlleles: 'A/T', maxBatchRows: 200 } };
(async () => {
  const model = app([]);
  const ahr = model.genes.find(g => g.id === 'rs6968865');
  for (const [input, expected, count] of [['AA', 'AA', 0], ['TA', 'AT', 1], ['A/T', 'AT', 1], ['TT', 'TT', 2]]) {
    const gt = model.normalizeGenotype(ahr, input);
    assert.equal(gt.code, expected);
    assert.equal(gt.alleleCount, count);
    assert.equal(gt.evidenceScore, count / 2);
  }
  for (const gt of ['GG', 'GT', 'TG']) assert.equal(model.normalizeGenotype(ahr, gt), null);
  const old = app([{ ok: true, capabilities: { batchSave: true } }]);
  await assert.rejects(old.save({}, 1), /업데이트/);
  assert.equal(old.posts(), 0);
  const saved = app([capabilities, { ok: false, state: 'unconfirmed' }, { ok: true, state: 'saved', savedCount: 2 }]);
  await saved.save({}, 2);
  assert.equal(saved.posts(), 1);
  const duplicate = app([capabilities, { ok: false, state: 'error', code: 'DUPLICATE_SAMPLE_ID' }]);
  await assert.rejects(duplicate.save({}, 1), /이미 저장된/);
  const lost = app([capabilities, ...Array(6).fill({ ok: false, state: 'unconfirmed' })]);
  await assert.rejects(lost.save({}, 1), /미확인/);
  const mismatch = app([capabilities, ...Array(6).fill({ ok: true, state: 'saved', savedCount: 1 })]);
  await assert.rejects(mismatch.save({}, 2), /미확인/);
  const uncertainTransport = app([capabilities, { ok: true, state: 'saved', savedCount: 1 }], true);
  await uncertainTransport.save({}, 1);
  console.log('Frontend allele, legacy endpoint, receipt, duplicate, timeout and count tests passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
