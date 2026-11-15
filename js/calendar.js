// Calendar arithmetic on plain dates. A date is an integer day number
// (days since 1970-01-01, proleptic Gregorian). No time zones, no Date object.
// The PHP runtime (src/Calendar.php) mirrors this file line by line.

export const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

const floorDiv = (a, b) => Math.floor(a / b);

/** Day number of a Gregorian date. */
export function dayNumber(year, month, day) {
  const y = month <= 2 ? year - 1 : year;
  const era = floorDiv(y, 400);
  const yoe = y - era * 400;
  const mp = month > 2 ? month - 3 : month + 9;
  const doy = floorDiv(153 * mp + 2, 5) + day - 1;
  const doe = yoe * 365 + floorDiv(yoe, 4) - floorDiv(yoe, 100) + doy;
  return era * 146097 + doe - 719468;
}

/** [year, month, day] of a day number. */
export function civil(n) {
  const z = n + 719468;
  const era = floorDiv(z, 146097);
  const doe = z - era * 146097;
  const yoe = floorDiv(doe - floorDiv(doe, 1460) + floorDiv(doe, 36524) - floorDiv(doe, 146096), 365);
  const doy = doe - (365 * yoe + floorDiv(yoe, 4) - floorDiv(yoe, 100));
  const mp = floorDiv(5 * doy + 2, 153);
  const day = doy - floorDiv(153 * mp + 2, 5) + 1;
  const month = mp < 10 ? mp + 3 : mp - 9;
  return [yoe + era * 400 + (month <= 2 ? 1 : 0), month, day];
}

/** ISO weekday of a day number: 1 = Monday … 7 = Sunday. */
export function isoWeekday(n) {
  return (((n + 3) % 7) + 7) % 7 + 1;
}

/** Weekday key ('mon' … 'sun') → ISO weekday. */
export function weekdayNumber(key) {
  return WEEKDAYS.indexOf(key) + 1;
}

export function isValidDate(year, month, day) {
  if (month < 1 || month > 12 || day < 1) return false;
  const [y, m, d] = civil(dayNumber(year, month, day));
  return y === year && m === month && d === day;
}

/** Day number → 'YYYY-MM-DD'. */
export function format(n) {
  const [y, m, d] = civil(n);
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** 'YYYY-MM-DD' → day number, or null when the string is not a valid date. */
export function parse(text) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(text));
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  return isValidDate(y, mo, d) ? dayNumber(y, mo, d) : null;
}

export function yearOf(n) {
  return civil(n)[0];
}

/** Western (Gregorian) Easter Sunday; anonymous Gregorian algorithm. */
export function westernEaster(year) {
  const a = year % 19;
  const b = floorDiv(year, 100);
  const c = year % 100;
  const d = floorDiv(b, 4);
  const e = b % 4;
  const f = floorDiv(b + 8, 25);
  const g = floorDiv(b - f + 1, 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = floorDiv(c, 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = floorDiv(a + 11 * h + 22 * l, 451);
  const month = floorDiv(h + l - 7 * m + 114, 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return dayNumber(year, month, day);
}

/** Orthodox Easter Sunday (Julian computus), as a Gregorian day number. */
export function orthodoxEaster(year) {
  const a = year % 4;
  const b = year % 7;
  const c = year % 19;
  const d = (19 * c + 15) % 30;
  const e = (2 * a + 4 * b - d + 34) % 7;
  const month = floorDiv(d + e + 114, 31);
  const day = ((d + e + 114) % 31) + 1;
  // Julian → Gregorian: the gap in days for dates from March onwards.
  const gap = floorDiv(year, 100) - floorDiv(year, 400) - 2;
  return dayNumber(year, month, day) + gap;
}

/**
 * The given weekday relative to a day number.
 * onOrAfter / after / onOrBefore / before.
 */
export function relativeWeekday(n, weekday, direction) {
  const target = weekdayNumber(weekday);
  switch (direction) {
    case 'onOrAfter':
      return n + ((target - isoWeekday(n) + 7) % 7);
    case 'after':
      return n + 1 + ((target - isoWeekday(n + 1) + 7) % 7);
    case 'onOrBefore':
      return n - ((isoWeekday(n) - target + 7) % 7);
    case 'before':
      return n - 1 - ((isoWeekday(n - 1) - target + 7) % 7);
    default:
      throw new Error(`Unknown direction "${direction}"`);
  }
}
