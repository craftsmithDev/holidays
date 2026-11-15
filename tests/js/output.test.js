// The committed build output is current and valid: src/data and js/data
// equal the compiled rules, every year file in json/ equals what the JS
// runtime computes now, and all outputs match their schemas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { countryDirs, FILE_YEARS, loadCountry, ROOT, validators } from '../../scripts/lib/data.mjs';
import { buildYear, encode } from '../../js/engine.js';
import bundled from '../../js/data/index.js';

const read = (path) => readFileSync(join(ROOT, path), 'utf8');

test('src/data and js/data match countries/', () => {
  const dirs = countryDirs(join(ROOT, 'countries'));
  assert.deepEqual(Object.keys(bundled).sort(), dirs.map((d) => d.split('/').pop().toUpperCase()).sort());
  for (const dir of dirs) {
    const { rules } = loadCountry(dir);
    const cc = rules.code.toLowerCase();
    assert.equal(read(`src/data/${cc}.json`), encode(rules), `run npm run build (${cc})`);
    assert.deepEqual(bundled[rules.code], rules);
  }
});

test('year files are current and valid', () => {
  for (const [code, rules] of Object.entries(bundled)) {
    const files = readdirSync(join(ROOT, 'json', code.toLowerCase()));
    assert.equal(files.length, FILE_YEARS.to - FILE_YEARS.from + 1);
    for (let y = FILE_YEARS.from; y <= FILE_YEARS.to; y += 1) {
      const text = read(`json/${code.toLowerCase()}/${y}.json`);
      const doc = JSON.parse(text);
      assert.ok(validators.year(doc), `${code} ${y}: ${JSON.stringify(validators.year.errors)}`);
      assert.equal(text, encode(buildYear(rules, y)), `${code} ${y}: run npm run build`);
    }
  }
});

test('index file is valid and lists every country', () => {
  const index = JSON.parse(read('json/index.json'));
  assert.ok(validators.index(index));
  assert.deepEqual(index.years, FILE_YEARS);
  assert.deepEqual(index.countries.map((c) => c.code), Object.keys(bundled).sort());
});
