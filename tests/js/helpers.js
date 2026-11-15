import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export const ROOT = new URL('../../', import.meta.url).pathname;

export const readJson = (path) => JSON.parse(readFileSync(join(ROOT, path), 'utf8'));

/** Compiled rules of a folder, keyed by country code. */
export function rulesIn(dir) {
  const out = {};
  for (const file of readdirSync(join(ROOT, dir)).filter((f) => f.endsWith('.json'))) {
    const rules = readJson(join(dir, file));
    out[rules.code] = rules;
  }
  return out;
}

/** The line format of tests/fixtures/expectations.json. */
export const line = (h) =>
  `${h.date} ${h.id}${h.substituteFor ? ` for ${h.substituteFor}` : ''}${h.startTime ? ` from ${h.startTime}` : ''} ${h.type}`;
