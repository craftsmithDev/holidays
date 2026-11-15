import { test } from 'node:test';
import assert from 'node:assert/strict';
import { civil, dayNumber, format, isoWeekday, orthodoxEaster, parse, relativeWeekday, westernEaster } from '../../js/calendar.js';

test('day numbers round-trip from 1583 to 9999', () => {
  for (let n = dayNumber(1583, 1, 1); n <= dayNumber(9999, 12, 31); n += 97) {
    const [y, m, d] = civil(n);
    assert.equal(dayNumber(y, m, d), n);
  }
  assert.equal(dayNumber(1970, 1, 1), 0);
  assert.equal(format(dayNumber(2000, 2, 29)), '2000-02-29');
});

test('weekdays', () => {
  assert.equal(isoWeekday(dayNumber(1970, 1, 1)), 4);
  assert.equal(isoWeekday(dayNumber(2026, 11, 15)), 7);
  assert.equal(isoWeekday(dayNumber(1600, 1, 1)), 6);
});

test('parse rejects invalid dates', () => {
  assert.equal(parse('2026-02-29'), null);
  assert.equal(parse('2024-02-29'), dayNumber(2024, 2, 29));
  assert.equal(parse('2026-1-01'), null);
  assert.equal(parse('2026-13-01'), null);
});

test('Western Easter (visibility reference dates and known years)', () => {
  const cases = { 2026: '2026-04-05', 2027: '2027-03-28', 2028: '2028-04-16', 2029: '2029-04-01', 2030: '2030-04-21', 2000: '2000-04-23', 2038: '2038-04-25', 2285: '2285-03-22' };
  for (const [y, date] of Object.entries(cases)) assert.equal(format(westernEaster(Number(y))), date);
});

test('Orthodox Easter', () => {
  const cases = { 2024: '2024-05-05', 2025: '2025-04-20', 2026: '2026-04-12', 2027: '2027-05-02', 2010: '2010-04-04' };
  for (const [y, date] of Object.entries(cases)) assert.equal(format(orthodoxEaster(Number(y))), date);
});

test('relative weekdays', () => {
  const thu = dayNumber(2026, 11, 12);
  assert.equal(format(relativeWeekday(thu, 'thu', 'onOrAfter')), '2026-11-12');
  assert.equal(format(relativeWeekday(thu, 'thu', 'after')), '2026-11-19');
  assert.equal(format(relativeWeekday(thu, 'thu', 'onOrBefore')), '2026-11-12');
  assert.equal(format(relativeWeekday(thu, 'thu', 'before')), '2026-11-05');
  assert.equal(format(relativeWeekday(thu, 'mon', 'after')), '2026-11-16');
  assert.equal(format(relativeWeekday(thu, 'mon', 'before')), '2026-11-09');
});
