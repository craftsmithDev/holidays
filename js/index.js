// @craftsmith/holidays: public holidays with sources, computed from the
// language-independent rules in data/ (compiled into ./data/).

import { Holidays } from './holidays.js';

export { Holidays } from './holidays.js';
export { HolidaysError, TYPES, FORMAT } from './engine.js';

let shared = null;
const instance = () => (shared ??= new Holidays());

// Shortcuts on one shared instance with the bundled data. Same names and
// arguments as the methods of Holidays.
export const countries = () => instance().countries();
export const regions = (country) => instance().regions(country);
export const year = (country, y) => instance().year(country, y);
export const holidays = (country, y, region = null, types = null) => instance().holidays(country, y, region, types);
export const isHoliday = (date, country, region = null, types = null) => instance().isHoliday(date, country, region, types);
export const next = (date, country, region = null, types = null) => instance().next(date, country, region, types);
export const previous = (date, country, region = null, types = null) => instance().previous(date, country, region, types);
