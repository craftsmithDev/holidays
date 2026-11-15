import { parse, yearOf } from './calendar.js';
import bundled from './data/index.js';
import { buildYear, checkYear, HolidaysError, TYPES } from './engine.js';

const DEFAULT_TYPES = ['public'];
const SEARCH_YEARS = 10;

/**
 * Holidays over a set of compiled country rules (dist/rules/<cc>.json).
 * Method names, arguments and results match the PHP class
 * craftsmith\holidays\Holidays.
 */
export class Holidays {
  /** @param {Record<string, object>} [rules] compiled rules keyed by country code; default: the bundled data */
  constructor(rules = bundled) {
    this.rules = {};
    for (const data of Object.values(rules)) this.rules[data.code] = data;
    this.cache = new Map();
  }

  /** Countries with their names, languages and regions. */
  countries() {
    return Object.values(this.rules)
      .sort((a, b) => (a.code < b.code ? -1 : a.code > b.code ? 1 : 0))
      .map((data) => this.#country(data));
  }

  /** Regions of a country: [{code, names}]. */
  regions(country) {
    return this.#country(this.#rules(country)).regions;
  }

  /** The full year document (identical to dist/json/<cc>/<year>.json). */
  year(country, year) {
    const rules = this.#rules(country);
    const key = `${rules.code}|${year}`;
    if (!this.cache.has(key)) this.cache.set(key, buildYear(rules, year));
    return this.cache.get(key);
  }

  /**
   * Holidays of a year. Without a region: only the nationwide ones.
   * @param {string|null} region e.g. 'ZH' or 'CH-ZH'
   * @param {string[]|null} types default ['public']
   */
  holidays(country, year, region = null, types = null) {
    const rules = this.#rules(country);
    const code = this.#region(rules, region);
    const wanted = this.#types(types);
    return this.year(rules.code, year).holidays.filter(
      (h) => wanted.includes(h.type) && (h.nationwide || (code !== null && h.regions.includes(code))),
    );
  }

  /** Whether a date ('YYYY-MM-DD' or a Date, read in local time) is a holiday of the given types. */
  isHoliday(date, country, region = null, types = null) {
    const [n, text] = this.#date(date);
    return this.holidays(country, yearOf(n), region, types).some((h) => h.date === text);
  }

  /** The first holiday strictly after a date, or null within ten years. */
  next(date, country, region = null, types = null) {
    const [n, text] = this.#date(date);
    const start = yearOf(n);
    for (let year = start; year <= Math.min(start + SEARCH_YEARS, 9999); year += 1) {
      const found = this.holidays(country, year, region, types).find((h) => h.date > text);
      if (found !== undefined) return found;
    }
    return null;
  }

  /** The last holiday strictly before a date, or null within ten years. */
  previous(date, country, region = null, types = null) {
    const [n, text] = this.#date(date);
    const start = yearOf(n);
    for (let year = start; year >= Math.max(start - SEARCH_YEARS, 1583); year -= 1) {
      const list = this.holidays(country, year, region, types).filter((h) => h.date < text);
      if (list.length > 0) return list[list.length - 1];
    }
    return null;
  }

  #country(data) {
    return {
      code: data.code,
      names: { ...data.names },
      languages: [...data.languages],
      regions: data.regions.map((r) => ({ code: r.code, names: { ...r.names } })),
    };
  }

  #rules(country) {
    const code = String(country ?? '').toUpperCase();
    const rules = this.rules[code];
    if (rules === undefined) throw new HolidaysError(`Unknown country "${country}"`);
    return rules;
  }

  #region(rules, region) {
    if (region === null || region === undefined || region === '') return null;
    const text = String(region).toUpperCase();
    const code = text.includes('-') ? text : `${rules.code}-${text}`;
    if (!rules.regions.some((r) => r.code === code)) {
      throw new HolidaysError(`Unknown region "${region}" for ${rules.code}`);
    }
    return code;
  }

  #types(types) {
    if (types === null || types === undefined) return DEFAULT_TYPES;
    for (const type of types) {
      if (!TYPES.includes(type)) throw new HolidaysError(`Unknown type "${type}"`);
    }
    return types;
  }

  #date(date) {
    if (date instanceof Date) {
      // A Date is read in the local time zone, like PHP reads a DateTimeInterface in its own.
      date = `${String(date.getFullYear()).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }
    const n = parse(date);
    if (n === null) throw new HolidaysError(`Date must be YYYY-MM-DD, got "${date}"`);
    checkYear(yearOf(n));
    return [n, date];
  }
}
