/** public = statutory day off; bank = banks closed, no general day off; observance = customary, not a statutory day off. */
export type HolidayType = 'public' | 'bank' | 'observance';

/** Names keyed by BCP 47 language tag; always has `en`, the local languages of the country and the translations. */
export type Names = { en: string } & Record<string, string>;

/** One holiday on one date, as in json/<cc>/<year>.json. */
export interface Holiday {
  /** YYYY-MM-DD */
  date: string;
  /** Stable id, e.g. "ch.national-day". */
  id: string;
  name: Names;
  type: HolidayType;
  /** null = whole day; otherwise the local time (HH:MM) from which the day is off. */
  startTime: string | null;
  /** null, or the original date this substitute day replaces. */
  substituteFor: string | null;
  /** true: applies in the whole country and `regions` is empty. */
  nationwide: boolean;
  /** ISO 3166-2 codes, when not nationwide. */
  regions: string[];
  /** Ids into YearDocument.sources. */
  sources: string[];
}

export interface Source {
  title: string;
  publisher?: string;
  law?: string;
  url: string;
  /** YYYY-MM-DD */
  accessed: string;
}

/** The year document (schema/year.schema.json). */
export interface YearDocument {
  format: 1;
  country: string;
  year: number;
  holidays: Holiday[];
  sources: Record<string, Source>;
}

export interface Region {
  code: string;
  names: Names;
}

export interface Country {
  code: string;
  names: Names;
  languages: string[];
  regions: Region[];
}

/** A date as 'YYYY-MM-DD', or a Date read in the local time zone. */
export type DateInput = string | Date;

/** A region as 'ZH' or 'CH-ZH' (case-insensitive); null = nationwide only. */
export type RegionInput = string | null;

export declare class HolidaysError extends Error {}

export declare const TYPES: readonly HolidayType[];
export declare const FORMAT: 1;

export declare class Holidays {
  /** @param rules compiled rules (src/data/<cc>.json) keyed by country code; default: the bundled data */
  constructor(rules?: Record<string, unknown>);
  countries(): Country[];
  regions(country: string): Region[];
  /** The name of a holiday by id in a language: the exact tag, then its base language, then English; null for an unknown id. */
  name(id: string, language: string): string | null;
  year(country: string, year: number): YearDocument;
  /** Holidays of a year. Without a region only the nationwide ones. Default types: ['public']. */
  holidays(country: string, year: number, region?: RegionInput, types?: HolidayType[] | null): Holiday[];
  isHoliday(date: DateInput, country: string, region?: RegionInput, types?: HolidayType[] | null): boolean;
  /** The first holiday strictly after the date, or null within ten years. */
  next(date: DateInput, country: string, region?: RegionInput, types?: HolidayType[] | null): Holiday | null;
  /** The last holiday strictly before the date, or null within ten years. */
  previous(date: DateInput, country: string, region?: RegionInput, types?: HolidayType[] | null): Holiday | null;
}

export declare function countries(): Country[];
export declare function regions(country: string): Region[];
export declare function name(id: string, language: string): string | null;
export declare function year(country: string, year: number): YearDocument;
export declare function holidays(country: string, year: number, region?: RegionInput, types?: HolidayType[] | null): Holiday[];
export declare function isHoliday(date: DateInput, country: string, region?: RegionInput, types?: HolidayType[] | null): boolean;
export declare function next(date: DateInput, country: string, region?: RegionInput, types?: HolidayType[] | null): Holiday | null;
export declare function previous(date: DateInput, country: string, region?: RegionInput, types?: HolidayType[] | null): Holiday | null;
