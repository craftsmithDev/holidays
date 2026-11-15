// Schema and semantic validation of every data file, plus rejection of
// typical mistakes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { checkSemantics, countryDirs, loadCountry, ROOT, validators } from '../../scripts/lib/data.mjs';

const dirs = [...countryDirs(join(ROOT, 'data')), ...countryDirs(join(ROOT, 'tests/fixtures/data'))];

for (const dir of dirs) {
  test(`valid: ${dir.slice(ROOT.length)}`, () => {
    const { errors } = loadCountry(dir);
    assert.deepEqual(errors, []);
  });
}

test('valid: data/_template', () => {
  assert.deepEqual(loadCountry(join(ROOT, 'data/_template'), { expectCode: false }).errors, []);
});

const holiday = (extra = {}) => ({
  id: 'xx.day',
  names: { en: 'Day', de: 'Tag' },
  date: { type: 'fixed', month: 1, day: 1 },
  observances: [{ regions: 'all', type: 'public', sources: ['s'] }],
  ...extra,
});
const schemaOk = (h) => validators.holidays({ holidays: [h] });

test('schema rejects malformed rules and observances', () => {
  assert.equal(schemaOk(holiday()), true);
  assert.equal(schemaOk(holiday({ date: { type: 'fixed', month: 13, day: 1 } })), false);
  assert.equal(schemaOk(holiday({ date: { type: 'fixed', month: 1 } })), false);
  assert.equal(schemaOk(holiday({ date: { type: 'easter', offset: 1, month: 3 } })), false, 'foreign key on a rule');
  assert.equal(schemaOk(holiday({ date: { type: 'list', dates: ['2026-1-1'] } })), false);
  assert.equal(schemaOk(holiday({ date: { type: 'list', dates: ['2026-01-01'], offset: 1 } })), false, 'list has no offset');
  assert.equal(schemaOk(holiday({ date: { type: 'nthWeekday', month: 5, weekday: 'monday', nth: 1 } })), false);
  assert.equal(schemaOk(holiday({ id: 'Day' })), false);
  assert.equal(schemaOk(holiday({ names: { de: 'Tag' } })), false, 'en is required');
  assert.equal(schemaOk(holiday({ observances: [{ regions: ['XX-AA'], except: ['XX-BB'], type: 'public', sources: ['s'] }] })), false, 'except needs all');
  assert.equal(schemaOk(holiday({ observances: [{ regions: 'all', type: 'holiday', sources: ['s'] }] })), false);
  assert.equal(schemaOk(holiday({ observances: [{ regions: 'all', type: 'public', sources: [] }] })), false, 'a source is required');
  assert.equal(schemaOk(holiday({ observances: [{ regions: 'all', type: 'public', startTime: '12', sources: ['s'] }] })), false);
  assert.equal(
    schemaOk(holiday({ date: { type: 'fixed', month: 1, day: 1, adjust: [{ when: { weekday: ['sun'] }, offset: 1, skip: true }] } })),
    false,
    'one action per adjust entry',
  );
});

const rules = (holidays, regions = [{ code: 'XX-AA', names: { en: 'A' } }]) => ({
  code: 'XX',
  names: { en: 'X', de: 'X' },
  languages: ['de'],
  regions,
  sources: { s: { title: 't', url: 'https://x.org', accessed: '2026-01-01' } },
  holidays,
});

test('semantic checks', () => {
  assert.deepEqual(checkSemantics(rules([holiday()]), 'xx'), []);
  const errors = (r, folder = 'xx') => checkSemantics(r, folder).join('\n');
  assert.match(errors(rules([holiday()]), 'yy'), /does not match the folder/);
  assert.match(errors(rules([holiday(), holiday()])), /used twice/);
  assert.match(errors(rules([holiday({ id: 'yy.day' })])), /must start with "xx\."/);
  assert.match(errors(rules([holiday({ names: { en: 'Day' } })])), /missing name in "de"/);
  assert.match(errors(rules([holiday({ observances: [{ regions: ['XX-ZZ'], type: 'public', sources: ['s'] }] })])), /unknown region XX-ZZ/);
  assert.match(errors(rules([holiday({ observances: [{ regions: 'all', type: 'public', sources: ['nope'] }] })])), /"nope" is cited/);
  assert.match(errors(rules([holiday({ date: { type: 'fixed', month: 2, day: 30 } })])), /not a date/);
  assert.match(errors(rules([holiday({ observances: [{ regions: ['XX-AA'], type: 'public', sources: ['s'] }] })], [])), /unknown region|no regions/);
});

test('ambiguous observances are rejected by the dry run', () => {
  const dir = join(ROOT, 'tests/fixtures/invalid/ambiguous');
  const { errors } = loadCountry(dir, { expectCode: false });
  assert.match(errors.join('\n'), /two observances match XX-AA/);
});
