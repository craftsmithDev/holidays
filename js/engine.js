// Evaluates the compiled rules of one country (src/data/<cc>.json) and builds
// the year document (json/<cc>/<year>.json). The semantics are specified
// in docs/format.md; the PHP runtime (src/Engine.php) mirrors this file.

import {
  civil,
  dayNumber,
  format,
  isoWeekday,
  isValidDate,
  orthodoxEaster,
  parse,
  relativeWeekday,
  weekdayNumber,
  westernEaster,
  yearOf,
} from './calendar.js';

export const FORMAT = 1;
export const TYPES = ['public', 'bank', 'observance'];
export const MIN_YEAR = 1583;
export const MAX_YEAR = 9999;

export class HolidaysError extends Error {}

const inRange = (item, year) =>
  (item.from === undefined || year >= item.from) && (item.to === undefined || year <= item.to);

/** The rule of a `date` field (object or list) that is valid in a year, or null. */
function pickRule(date, year, where) {
  const rules = Array.isArray(date) ? date : [date];
  const valid = rules.filter((rule) => inRange(rule, year));
  if (valid.length > 1) {
    throw new HolidaysError(`${where}: more than one date rule is valid in ${year}`);
  }
  return valid[0] ?? null;
}

/** Day numbers a rule yields for a year (offset and adjust applied). */
export function evaluateRule(rule, year) {
  let days;
  switch (rule.type) {
    case 'fixed':
      days = isValidDate(year, rule.month, rule.day) ? [dayNumber(year, rule.month, rule.day)] : [];
      break;
    case 'easter':
      days = [(rule.calendar === 'orthodox' ? orthodoxEaster : westernEaster)(year)];
      break;
    case 'nthWeekday':
      days = nthWeekday(year, rule.month, rule.weekday, rule.nth);
      break;
    case 'relativeWeekday':
      days = evaluateRule(rule.base, year).map((n) => relativeWeekday(n, rule.weekday, rule.direction));
      break;
    case 'list':
      return rule.dates
        .map((text) => parse(text))
        .filter((n) => n !== null && yearOf(n) === year)
        .sort((a, b) => a - b);
    default:
      throw new HolidaysError(`Unknown rule type "${rule.type}"`);
  }
  const offset = rule.offset ?? 0;
  return days
    .map((n) => applyAdjust(rule.adjust, n + offset, year))
    .filter((n) => n !== null);
}

function nthWeekday(year, month, weekday, nth) {
  const target = weekdayNumber(weekday);
  let n;
  if (nth > 0) {
    const first = dayNumber(year, month, 1);
    n = first + ((target - isoWeekday(first) + 7) % 7) + 7 * (nth - 1);
  } else {
    const last = (month === 12 ? dayNumber(year + 1, 1, 1) : dayNumber(year, month + 1, 1)) - 1;
    n = last - ((isoWeekday(last) - target + 7) % 7) - 7 * (-nth - 1);
  }
  return civil(n)[1] === month ? [n] : [];
}

/** Whether all keys of a condition hold for a day number. */
export function conditionHolds(when, n, year) {
  if (when.weekday !== undefined && !when.weekday.map(weekdayNumber).includes(isoWeekday(n))) {
    return false;
  }
  if (when.sameDateAs !== undefined && !evaluateRule(when.sameDateAs, year).includes(n)) {
    return false;
  }
  if (when.between !== undefined) {
    const from = evaluateRule(when.between.from, year);
    const to = evaluateRule(when.between.to, year);
    if (from.length === 0 || to.length === 0 || n < from[0] || n > to[to.length - 1]) {
      return false;
    }
  }
  return true;
}

/** The first matching adjust entry, applied; null when it says skip. */
export function applyAdjust(adjust, n, year) {
  for (const entry of adjust ?? []) {
    if (!conditionHolds(entry.when, n, year)) continue;
    if (entry.skip) return null;
    if (entry.offset !== undefined) return n + entry.offset;
    return relativeWeekday(n, entry.moveTo.weekday, entry.moveTo.direction);
  }
  return n;
}

/**
 * The observance of a holiday that applies to a region in a year, or null.
 * region null = a country without regions. The most specific scope wins:
 * a listed region beats `all`. Two equally specific matches are a data error.
 */
function pickObservance(holiday, region, year) {
  let best = null;
  let bestRank = -1;
  for (const observance of holiday.observances) {
    if (!inRange(observance, year)) continue;
    if (observance.years !== undefined && !observance.years.includes(year)) continue;
    let rank;
    if (observance.regions === 'all') {
      if (region !== null && (observance.except ?? []).includes(region)) continue;
      rank = 0;
    } else if (region !== null && observance.regions.includes(region)) {
      rank = 1;
    } else {
      continue;
    }
    if (rank === bestRank) {
      throw new HolidaysError(`${holiday.id}: two observances match ${region ?? 'the country'} in ${year}`);
    }
    if (rank > bestRank) {
      best = observance;
      bestRank = rank;
    }
  }
  return best;
}

/** Holiday occurrences (before substitutes) of one region in one year. */
function baseOccurrences(rules, region, year) {
  const out = [];
  rules.holidays.forEach((holiday, index) => {
    if (!inRange(holiday, year)) return;
    const observance = pickObservance(holiday, region, year);
    if (observance === null) return;
    const rule = pickRule(observance.date ?? holiday.date, year, holiday.id);
    if (rule === null) return;
    for (const ruleDay of evaluateRule(rule, year)) {
      const n = applyAdjust(observance.adjust, ruleDay, year);
      if (n === null || yearOf(n) !== year) continue;
      out.push({ n, index, holiday, observance, substituteFor: null });
    }
  });
  return out;
}

const blocksSubstitute = (occurrence) =>
  occurrence.observance.type === 'public' && occurrence.observance.startTime === undefined;

/**
 * All occurrences of one region in one year, substitutes included. The
 * previous year is evaluated too, so that a substitute for 31 December can
 * land in January.
 */
export function occurrences(rules, region, year) {
  const all = [];
  if (year > MIN_YEAR) all.push(...baseOccurrences(rules, region, year - 1));
  all.push(...baseOccurrences(rules, region, year));
  all.sort((a, b) => a.n - b.n || a.index - b.index);

  const taken = new Set(all.filter(blocksSubstitute).map((o) => o.n));
  const substitutes = [];
  for (const occurrence of all) {
    const substitute = occurrence.observance.substitute;
    if (substitute === undefined || !conditionHolds(substitute.when, occurrence.n, yearOf(occurrence.n))) {
      continue;
    }
    const avoid = substitute.avoidWeekdays.map(weekdayNumber);
    let n = occurrence.n + 1;
    while (avoid.includes(isoWeekday(n)) || taken.has(n)) n += 1;
    taken.add(n);
    substitutes.push({ ...occurrence, n, substituteFor: occurrence.n });
  }
  return [...all, ...substitutes].filter((o) => yearOf(o.n) === year);
}

export function checkYear(year) {
  if (!Number.isInteger(year) || year < MIN_YEAR || year > MAX_YEAR) {
    throw new HolidaysError(`Year must be an integer from ${MIN_YEAR} to ${MAX_YEAR}, got ${year}`);
  }
}

/** The year document of a country (see schema/year.schema.json). */
export function buildYear(rules, year) {
  checkYear(year);
  const regions = rules.regions.length > 0 ? rules.regions.map((r) => r.code) : [null];
  const sourceOrder = Object.keys(rules.sources);
  const groups = new Map();

  for (const region of regions) {
    for (const o of occurrences(rules, region, year)) {
      const type = o.observance.type;
      const startTime = o.observance.startTime ?? null;
      const substituteFor = o.substituteFor === null ? null : format(o.substituteFor);
      const key = [o.n, o.holiday.id, type, startTime, substituteFor].join('|');
      let group = groups.get(key);
      if (group === undefined) {
        group = { n: o.n, index: o.index, holiday: o.holiday, type, startTime, substituteFor, regions: [], sources: new Set() };
        groups.set(key, group);
      }
      if (region !== null) group.regions.push(region);
      for (const id of [...(o.holiday.sources ?? []), ...o.observance.sources]) group.sources.add(id);
    }
  }

  const list = [...groups.values()].sort(
    (a, b) =>
      a.n - b.n ||
      a.index - b.index ||
      (a.substituteFor === null ? 0 : 1) - (b.substituteFor === null ? 0 : 1) ||
      TYPES.indexOf(a.type) - TYPES.indexOf(b.type),
  );
  const used = new Set();
  const holidays = list.map((g) => {
    const nationwide = regions[0] === null || g.regions.length === regions.length;
    const sources = sourceOrder.filter((id) => g.sources.has(id));
    sources.forEach((id) => used.add(id));
    return {
      date: format(g.n),
      id: g.holiday.id,
      name: { ...g.holiday.names },
      type: g.type,
      startTime: g.startTime,
      substituteFor: g.substituteFor,
      nationwide,
      regions: nationwide ? [] : g.regions,
      sources,
    };
  });
  const sources = {};
  for (const id of sourceOrder) {
    if (used.has(id)) sources[id] = { ...rules.sources[id] };
  }
  return { format: FORMAT, country: rules.code, year, holidays, sources };
}

/** Same encoding in both runtimes: 2-space indent, no escaped slashes or Unicode, final newline. */
export function encode(document) {
  return `${JSON.stringify(document, null, 2)}\n`;
}
