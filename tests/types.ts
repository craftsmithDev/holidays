// Compile-only check of js/index.d.ts (npm run test:types).
import { Holidays, holidays, isHoliday, name, next, TYPES, type Holiday, type YearDocument } from '../js/index.js';

const list: Holiday[] = holidays('CH', 2026, 'ZH', ['public', 'observance']);
const free: boolean = isHoliday(new Date(2026, 7, 1), 'CH');
const after: Holiday | null = next('2026-12-24', 'CH', 'CH-ZH');
const doc: YearDocument = new Holidays().year('LI', 2027);
const first: string | null = list[0]?.startTime ?? null;
const types: readonly string[] = TYPES;
const label: string | null = name('ch.national-day', 'rm');
// @ts-expect-error unknown type
holidays('CH', 2026, null, ['school']);
export { free, after, doc, first, types, label };
