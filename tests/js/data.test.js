// Schema and semantic validation of every data file, plus rejection of
// typical mistakes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  checkSemantics,
  checkTranslationIds,
  countryDirs,
  FIXTURE_REGIONS,
  loadCountry,
  REGIONS,
  ROOT,
  TRANSLATIONS,
  validators,
} from '../../scripts/lib/data.mjs';
import bundled from '../../js/data/index.js';

const FIXTURES = { regions: FIXTURE_REGIONS, translations: {} };

for (const dir of countryDirs(join(ROOT, 'countries'))) {
  test(`valid: ${dir.slice(ROOT.length)}`, () => {
    const { errors } = loadCountry(dir);
    assert.deepEqual(errors, []);
  });
}
for (const dir of countryDirs(join(ROOT, 'tests/fixtures/data'))) {
  test(`valid: ${dir.slice(ROOT.length)}`, () => {
    const { errors } = loadCountry(dir, FIXTURES);
    assert.deepEqual(errors, []);
  });
}

test('valid: countries/_template', () => {
  assert.deepEqual(loadCountry(join(ROOT, 'countries/_template'), { expectCode: false, ...FIXTURES }).errors, []);
});

// Country names, languages and region names come from craftsmith/regions
// (docs/decisions.md D16); every region code holidays uses exists there.
test('countries and regions are those of craftsmith/regions', () => {
  for (const rules of Object.values(bundled)) {
    const country = REGIONS[rules.code];
    assert.ok(country, `${rules.code} is a country of craftsmith/regions`);
    assert.deepEqual(rules.names, country.names, rules.code);
    assert.deepEqual(rules.languages, country.languages, rules.code);
    for (const region of rules.regions) {
      const theirs = country.regions.find((r) => r.code === region.code);
      assert.ok(theirs, `${region.code} exists in craftsmith/regions`);
      assert.deepEqual(region.names, theirs.names, region.code);
    }
  }
});

test('a region code unknown to craftsmith/regions is rejected', () => {
  const regions = { XX: { ...FIXTURE_REGIONS.XX, regions: FIXTURE_REGIONS.XX.regions.slice(0, 1) } };
  const { errors } = loadCountry(join(ROOT, 'tests/fixtures/data/xx'), { regions, translations: {} });
  assert.match(errors.join('\n'), /region XX-BB is not in craftsmith\/regions/);
  assert.match(loadCountry(join(ROOT, 'tests/fixtures/data/xy'), { regions: {}, translations: {} }).errors.join('\n'), /XY is not a country/);
});

// Translations (docs/decisions.md D17): one file per plugin language except
// English, valid, only known ids, and together with rules.yaml a name for
// every holiday in every plugin language.
const PLUGIN_LANGUAGES = ['en', 'de', 'fr', 'it', 'es', 'nl', 'pl', 'pt', 'ru', 'tr', 'rm'];

test('translation files: one per plugin language, valid, known ids', () => {
  const files = readdirSync(join(ROOT, 'translations')).sort();
  assert.deepEqual(files, PLUGIN_LANGUAGES.filter((l) => l !== 'en').map((l) => `${l}.yaml`).sort());
  assert.deepEqual(TRANSLATIONS.errors, []);
  assert.deepEqual(checkTranslationIds(TRANSLATIONS.translations, Object.values(bundled)), []);
  assert.match(checkTranslationIds({ de: { CH: { 'ch.nope': 'x' } } }, Object.values(bundled)).join('\n'), /unknown holiday ch\.nope/);
});

test('every holiday has a name in every plugin language', () => {
  const missing = [];
  for (const rules of Object.values(bundled)) {
    for (const h of rules.holidays) {
      for (const lang of PLUGIN_LANGUAGES) if (h.names[lang] === undefined) missing.push(`${h.id} ${lang}`);
    }
  }
  assert.deepEqual(missing, []);
});

test('a translation may not name a local language or repeat rules.yaml', () => {
  const local = loadCountry(join(ROOT, 'tests/fixtures/data/xy'), { regions: FIXTURE_REGIONS, translations: { fr: { XY: { 'xy.national-day': 'x' } } } });
  assert.match(local.errors.join('\n'), /"fr" is a local language/);
  const repeated = loadCountry(join(ROOT, 'countries/es'), { translations: { ca: { ES: { 'es.aran-day': 'x' } } } });
  assert.match(repeated.errors.join('\n'), /repeats the name in rules\.yaml/);
});

const holiday = (extra = {}) => ({
  id: 'xx.day',
  names: { en: 'Day', de: 'Tag' },
  date: { type: 'fixed', month: 1, day: 1 },
  observances: [{ regions: 'all', type: 'public', sources: ['s'] }],
  ...extra,
});
const base = {
  code: 'XX',
  regions: [],
  sources: { s: { title: 't', url: 'https://x.org', accessed: '2026-01-01' } },
};
const schemaOk = (h) => validators.rules({ ...base, holidays: [h] });

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
  const { errors } = loadCountry(dir, { expectCode: false, ...FIXTURES });
  assert.match(errors.join('\n'), /two observances match XX-AA/);
});
