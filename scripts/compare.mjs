// Compares our data with two external datasets and writes a report of the
// differences. The external data is a cross-check, never a source.
//
//   node scripts/compare.mjs [CC ...] [--from 2024] [--to 2030] [--offline]
//
// - OpenHolidays API (https://openholidaysapi.org), one request per country
//   and year (network). --offline skips it.
// - date-holidays (npm, dev dependency), read only.
//
// Writes docs/verification/report-<cc>.md. Every difference must be
// explained in docs/verification/<cc>.md.

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import DateHolidays from 'date-holidays';
import { Holidays, TYPES } from '../js/index.js';
import { ROOT } from './lib/data.mjs';

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const i = args.indexOf(name);
  return i === -1 ? fallback : Number(args[i + 1]);
};
const from = option('--from', 2024);
const to = option('--to', 2030);
const offline = args.includes('--offline');
const ours = new Holidays();
const wanted = args.filter((a, i) => /^[A-Za-z]{2}$/.test(a) && !['--from', '--to'].includes(args[i - 1])).map((a) => a.toUpperCase());
const countries = wanted.length > 0 ? wanted : ours.countries().map((c) => c.code);

const isoDay = (text) => String(text).slice(0, 10);
const weekday = (date) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(`${date}T12:00:00Z`).getUTCDay()];

/** region (or '' for nationwide-only countries) → date → label */
function ourDates(country, year) {
  const regions = ours.regions(country).map((r) => r.code);
  const out = {};
  for (const region of regions.length > 0 ? regions : ['']) {
    out[region] = {};
    for (const h of ours.holidays(country, year, region || null, TYPES)) {
      const label = `${h.name.en} (${h.type}${h.startTime ? ` from ${h.startTime}` : ''}${h.substituteFor ? `, substitute` : ''})`;
      out[region][h.date] = out[region][h.date] ? `${out[region][h.date]}; ${label}` : label;
    }
  }
  return out;
}

/** OpenHolidays subdivision code (e.g. FR-GE-MO) → ISO 3166-2 code (FR-57), per country. */
const ohIsoCodes = new Map();
async function openHolidaysIsoCodes(country) {
  if (!ohIsoCodes.has(country)) {
    const response = await fetch(`https://openholidaysapi.org/Subdivisions?countryIsoCode=${country}`, { headers: { accept: 'application/json' } });
    if (!response.ok) throw new Error(`OpenHolidays subdivisions ${country}: HTTP ${response.status}`);
    const map = {};
    const walk = (list) => {
      for (const s of list ?? []) {
        if (s.isoCode) map[s.code] = s.isoCode;
        walk(s.children);
      }
    };
    walk(await response.json());
    ohIsoCodes.set(country, map);
  }
  return ohIsoCodes.get(country);
}

async function openHolidays(country, year, regions) {
  const isoCodes = await openHolidaysIsoCodes(country);
  const url = `https://openholidaysapi.org/PublicHolidays?countryIsoCode=${country}&validFrom=${year}-01-01&validTo=${year}-12-31&languageIsoCode=EN`;
  const response = await fetch(url, { headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  const items = await response.json();
  const out = Object.fromEntries((regions.length > 0 ? regions : ['']).map((r) => [r, {}]));
  for (const item of items) {
    const name = (item.name ?? []).find((n) => n.language === 'EN')?.text ?? item.name?.[0]?.text ?? '?';
    const scope = item.regionalScope && item.regionalScope !== 'National' && item.regionalScope !== 'Regional' ? `, ${item.regionalScope}` : '';
    const label = `${name} (${item.type}${scope})`;
    const days = [];
    for (let d = new Date(`${item.startDate}T00:00:00Z`); isoDay(d.toISOString()) <= item.endDate; d.setUTCDate(d.getUTCDate() + 1)) {
      days.push(isoDay(d.toISOString()));
    }
    const targets = item.nationwide || regions.length === 0
      ? Object.keys(out)
      : (item.subdivisions ?? []).map((s) => isoCodes[s.code] ?? s.code).filter((code) => code in out);
    for (const region of targets) for (const day of days) out[region][day] = out[region][day] ? `${out[region][day]}; ${label}` : label;
  }
  return out;
}

// ISO 3166-2 codes that date-holidays knows under another state code.
const DATE_HOLIDAYS_STATES = { 'FR-971': 'GP', 'FR-972': 'MQ', 'FR-973': 'GF', 'FR-974': 'RE', 'FR-976': 'YT' };

function dateHolidays(country, year, regions) {
  const out = {};
  // date-holidays knows only some subdivisions (AD: 2 of 7 parishes); use the
  // country rules for the others instead of crashing.
  const known = new DateHolidays().getStates(country) || {};
  for (const region of regions.length > 0 ? regions : ['']) {
    const state = DATE_HOLIDAYS_STATES[region] ?? region.split('-')[1];
    const hd = region && known[state] ? new DateHolidays(country, state) : new DateHolidays(country);
    out[region] = {};
    for (const h of hd.getHolidays(year) || []) {
      if (h.type === 'school') continue;
      const day = isoDay(h.date);
      const label = `${h.name} (${h.type}${h.substitute ? ', substitute' : ''})`;
      out[region][day] = out[region][day] ? `${out[region][day]}; ${label}` : label;
    }
  }
  return out;
}

/** Differences grouped by region and label, with the dates. */
function diff(a, b) {
  const rows = [];
  for (const region of Object.keys(a)) {
    const left = a[region] ?? {};
    const right = b[region] ?? {};
    for (const [date, label] of Object.entries(left)) if (!(date in right)) rows.push({ region, side: 'ours only', date, label });
    for (const [date, label] of Object.entries(right)) if (!(date in left)) rows.push({ region, side: 'theirs only', date, label });
  }
  return rows;
}

function table(rows, regionCount) {
  if (rows.length === 0) return 'No differences.\n';
  const groups = new Map();
  for (const row of rows) {
    const label = row.label.replace(/\d{4}/g, '');
    const key = `${row.side}|${label}`;
    if (!groups.has(key)) groups.set(key, { side: row.side, label, entries: new Map() });
    const entry = groups.get(key).entries;
    if (!entry.has(row.date)) entry.set(row.date, []);
    entry.get(row.date).push(row.region.replace(/^[A-Z]{2}-/, '') || 'all');
  }
  let out = '| Side | Holiday (their or our label) | Dates and regions |\n|---|---|---|\n';
  for (const g of [...groups.values()].sort((x, y) => (x.side + x.label).localeCompare(y.side + y.label))) {
    const cells = [...g.entries.entries()]
      .sort()
      .map(([date, regions]) => `${date} ${weekday(date)}: ${regionCount > 1 && regions.length === regionCount ? 'all regions' : regions.join(', ')}`);
    out += `| ${g.side} | ${g.label.replace(/\|/g, '/')} | ${cells.join('<br>')} |\n`;
  }
  return out;
}

for (const country of countries) {
  const regions = ours.regions(country).map((r) => r.code);
  const sections = { openholidays: [], dateholidays: [] };
  for (let year = from; year <= to; year += 1) {
    const mine = ourDates(country, year);
    if (!offline) {
      try {
        sections.openholidays.push(...diff(mine, await openHolidays(country, year, regions)));
      } catch (e) {
        sections.openholidays.push({ region: '', side: 'error', date: String(year), label: e.message });
      }
    }
    sections.dateholidays.push(...diff(mine, dateHolidays(country, year, regions)));
  }
  const report = `# ${country}: comparison with external data, ${from}–${to}

Generated by \`node scripts/compare.mjs ${country} --from ${from} --to ${to}\` on ${new Date().toISOString().slice(0, 10)}.
Our side: every type (public, bank, observance) per region. External data is a cross-check, not a source.
The explanation of each difference is in [${country.toLowerCase()}.md](${country.toLowerCase()}.md).

## OpenHolidays API

${offline ? 'Skipped (--offline).\n' : table(sections.openholidays, regions.length)}
## date-holidays (npm)

${table(sections.dateholidays, regions.length)}`;
  const file = join(ROOT, 'docs/verification', `report-${country.toLowerCase()}.md`);
  writeFileSync(file, report);
  console.log(`${country}: ${sections.openholidays.length} OpenHolidays and ${sections.dateholidays.length} date-holidays differences → ${file}`);
}
