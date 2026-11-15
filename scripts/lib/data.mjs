// Loads, validates and compiles the rule files countries/<cc>/rules.yaml.
// Used by the build and by the tests. Any problem is collected and reported; a country
// with problems is never compiled.

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';
import Ajv from 'ajv/dist/2020.js';
import { isValidDate } from '../../js/calendar.js';
import { buildYear, FORMAT } from '../../js/engine.js';

export const ROOT = new URL('../../', import.meta.url).pathname;
// Every country is computed and checked for these years (build dry run,
// cross-runtime test). The committed year files cover the shorter range.
export const YEARS = { from: 2000, to: 2050 };
export const FILE_YEARS = { from: 2025, to: 2036 };

const ajv = new Ajv({ allErrors: true, strict: true, strictRequired: false });
const schema = (name) => JSON.parse(readFileSync(join(ROOT, 'schema', `${name}.schema.json`), 'utf8'));
export const validators = {
  rules: ajv.compile(schema('rules')),
  year: ajv.compile(schema('year')),
  index: ajv.compile(schema('index')),
};

/** YAML with the JSON schema: no implicit dates, no yes/no booleans, no octal. */
export function readYaml(file) {
  return yaml.load(readFileSync(file, 'utf8'), { schema: yaml.JSON_SCHEMA, filename: file });
}

/** Country folders below a directory (folders starting with _ are skipped). */
export function countryDirs(dataDir) {
  return readdirSync(dataDir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith('_'))
    .map((e) => join(dataDir, e.name))
    .sort();
}

const schemaErrors = (label, validate) =>
  (validate.errors ?? []).map((e) => `${label}${e.instancePath || '/'} ${e.message}${e.params?.allowedValues ? ` (${e.params.allowedValues.join(', ')})` : ''}`);

/**
 * Loads one country folder. Returns {rules, errors}; rules is null when
 * there are errors. `expectCode` false skips the folder-name check (template).
 */
export function loadCountry(dir, { expectCode = true, years = YEARS } = {}) {
  const name = dir.split('/').pop();
  const file = join(dir, 'rules.yaml');
  if (!existsSync(file)) return { rules: null, errors: [`${name}: missing rules.yaml`] };
  let data;
  try {
    data = readYaml(file);
  } catch (e) {
    return { rules: null, errors: [`${name}/rules.yaml: ${e.message}`] };
  }
  if (!validators.rules(data)) return { rules: null, errors: schemaErrors(`${name}/rules.yaml`, validators.rules) };

  const errors = [];
  const rules = {
    format: FORMAT,
    code: data.code,
    names: data.names,
    languages: data.languages,
    regions: data.regions,
    sources: data.sources,
    holidays: data.holidays,
  };
  errors.push(...checkSemantics(rules, name, expectCode));
  if (errors.length === 0) {
    for (let y = years.from; y <= years.to; y += 1) {
      try {
        buildYear(rules, y);
      } catch (e) {
        errors.push(`${name}: ${e.message}`);
        break;
      }
    }
  }
  return { rules: errors.length === 0 ? rules : null, errors };
}

function eachRule(date, fn) {
  for (const rule of Array.isArray(date) ? date : [date]) walkRule(rule, fn);
}

function walkRule(rule, fn) {
  fn(rule);
  if (rule.base) walkRule(rule.base, fn);
  for (const a of rule.adjust ?? []) walkCondition(a.when, fn);
}

function walkCondition(when, fn) {
  if (when.sameDateAs) walkRule(when.sameDateAs, fn);
  if (when.between) {
    walkRule(when.between.from, fn);
    walkRule(when.between.to, fn);
  }
}

/** Checks the schema cannot express. */
export function checkSemantics(rules, folder, expectCode = true) {
  const errors = [];
  const at = (where, message) => errors.push(`${folder}: ${where}: ${message}`);
  const cc = rules.code.toLowerCase();
  if (expectCode && folder !== cc) at('code', `code ${rules.code} does not match the folder name "${folder}"`);

  const regionCodes = new Set();
  for (const region of rules.regions) {
    if (!region.code.startsWith(`${rules.code}-`)) at(`region ${region.code}`, `must start with ${rules.code}-`);
    if (regionCodes.has(region.code)) at(`region ${region.code}`, 'listed twice');
    regionCodes.add(region.code);
  }
  for (const lang of [...rules.languages, 'en']) {
    if (rules.names[lang] === undefined) at('country names', `missing language "${lang}"`);
  }

  const usedSources = new Set();
  const ids = new Set();
  for (const holiday of rules.holidays) {
    const where = holiday.id ?? '(holiday without id)';
    if (!holiday.id.startsWith(`${cc}.`)) at(where, `id must start with "${cc}."`);
    if (ids.has(holiday.id)) at(where, 'id is used twice');
    ids.add(holiday.id);
    for (const lang of [...rules.languages, 'en']) {
      if (holiday.names[lang] === undefined) at(where, `missing name in "${lang}"`);
    }
    if (holiday.from !== undefined && holiday.to !== undefined && holiday.from > holiday.to) at(where, 'from is after to');

    const checkDate = (date, label) =>
      eachRule(date, (rule) => {
        if (rule.type === 'fixed' && !isValidDate(2000, rule.month, rule.day)) at(where, `${label}: ${rule.month}-${rule.day} is not a date`);
        if (rule.from !== undefined && rule.to !== undefined && rule.from > rule.to) at(where, `${label}: from is after to`);
        if (rule.type === 'list') {
          for (const text of rule.dates) {
            const [y, m, d] = text.split('-').map(Number);
            if (!isValidDate(y, m, d)) at(where, `${label}: ${text} is not a date`);
          }
        }
      });
    checkDate(holiday.date, 'date');
    for (const id of holiday.sources ?? []) usedSources.add(id);

    holiday.observances.forEach((o, i) => {
      const label = `observance ${i + 1}`;
      if (o.date !== undefined) checkDate(o.date, `${label} date`);
      for (const a of o.adjust ?? []) walkCondition(a.when, () => {});
      const listed = o.regions === 'all' ? [] : o.regions;
      for (const code of [...listed, ...(o.except ?? [])]) {
        if (!regionCodes.has(code)) at(where, `${label}: unknown region ${code}`);
      }
      if (regionCodes.size === 0 && o.regions !== 'all') at(where, `${label}: the country has no regions, use regions: all`);
      if (o.from !== undefined && o.to !== undefined && o.from > o.to) at(where, `${label}: from is after to`);
      for (const id of o.sources) usedSources.add(id);
    });
  }
  for (const id of usedSources) {
    if (rules.sources[id] === undefined) at('sources', `"${id}" is cited but not in the source catalogue`);
  }
  for (const id of Object.keys(rules.sources)) {
    if (!usedSources.has(id)) at('sources', `"${id}" is in the source catalogue but never cited`);
  }
  return errors;
}
