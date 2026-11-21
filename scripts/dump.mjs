// Writes the year files and the index with the JS runtime, in the layout of
// json/, and names.json: name() for every holiday in every language its data
// has, plus de-CH, pt_BR and zz (the fallbacks), and an unknown id.
// scripts/dump.php does the same with the PHP runtime; the cross-runtime test
// (tests/php/CrossRuntimeTest.php) compares both.
//   node scripts/dump.mjs <out-dir> [rules-dir] [from] [to]

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Holidays } from '../js/index.js';
import { encode, FORMAT } from '../js/engine.js';
import { ROOT, YEARS } from './lib/data.mjs';

const [out, rulesDir = join(ROOT, 'src/data'), from = YEARS.from, to = YEARS.to] = process.argv.slice(2);
if (out === undefined) {
  console.error('usage: node scripts/dump.mjs <out-dir> [rules-dir] [from] [to]');
  process.exit(2);
}

const rules = {};
for (const file of readdirSync(rulesDir).filter((f) => f.endsWith('.json'))) {
  const data = JSON.parse(readFileSync(join(rulesDir, file), 'utf8'));
  rules[data.code] = data;
}
const holidays = new Holidays(rules);
let files = 0;
for (const country of holidays.countries()) {
  const dir = join(out, country.code.toLowerCase());
  mkdirSync(dir, { recursive: true });
  for (let y = Number(from); y <= Number(to); y += 1) {
    writeFileSync(join(dir, `${y}.json`), encode(holidays.year(country.code, y)));
    files += 1;
  }
}
writeFileSync(
  join(out, 'index.json'),
  encode({ format: FORMAT, years: { from: Number(from), to: Number(to) }, countries: holidays.countries() }),
);
const names = {};
for (const country of holidays.countries()) {
  for (const h of rules[country.code].holidays) {
    const tags = [...new Set(['de-CH', 'pt_BR', 'zz', ...Object.keys(h.names)])].sort();
    names[h.id] = Object.fromEntries(tags.map((tag) => [tag, holidays.name(h.id, tag)]));
  }
}
names['zz.unknown'] = { en: holidays.name('zz.unknown', 'en') };
writeFileSync(join(out, 'names.json'), encode(names));
console.log(`Wrote ${files} year files and the names of ${Object.keys(names).length - 1} holidays to ${out}`);
