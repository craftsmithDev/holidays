// The shared cases of tests/fixtures/expectations.json (PHP runs the same).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Holidays, HolidaysError } from '../../js/index.js';
import { line, readJson, rulesIn } from './helpers.js';

const { all, cases } = readJson('tests/fixtures/expectations.json');
const instances = { fixtures: new Holidays(rulesIn('tests/fixtures/rules')), bundled: new Holidays() };

for (const c of cases) {
  test(c.name, () => {
    const args = c.args.map((a, i) => (i === 3 && a === 'all' ? all : a));
    const call = () => instances[c.data][c.method](...args);
    if (c.error) {
      assert.throws(call, HolidaysError);
      return;
    }
    const result = call();
    if (c.method === 'holidays') assert.deepEqual(result.map(line), c.expect);
    else if (c.method === 'isHoliday') assert.equal(result, c.expect);
    else assert.equal(result === null ? null : line(result), c.expect);
  });
}
