// Golden test: CH 2026–2030 equals the visibility reference dataset, apart
// from the documented deviations (docs/verification/ch.md).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Holidays, TYPES } from '../../js/index.js';
import { readJson } from './helpers.js';

const golden = readJson('tests/golden/ch-2026-2030.json').dates;
const { deviations } = readJson('tests/golden/ch-deviations.json');
const holidays = new Holidays();

test('CH 2026–2030 per canton equals the visibility reference', () => {
  for (const [region, years] of Object.entries(golden)) {
    for (const [year, dates] of Object.entries(years)) {
      const expected = new Set(dates);
      for (const d of deviations.filter((x) => x.region === region)) {
        for (const date of d.dates.filter((x) => x.startsWith(year))) {
          if (d.change === 'added') expected.add(date);
          else expected.delete(date);
        }
      }
      const ours = [...new Set(holidays.holidays('CH', Number(year), region, TYPES).map((h) => h.date))].sort();
      assert.deepEqual(ours, [...expected].sort(), `${region} ${year}`);
    }
  }
});
