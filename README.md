# craftsmith/holidays

Public holidays for Western Europe, national and regional, with the legal source for every day. One set of rule files, a PHP package and a JS package that compute the same results, and precomputed JSON for everything else.

- **Sourced.** Each holiday cites the law or official page it comes from, with URL and the date it was read. Differences with other datasets are explained in [docs/verification](docs/verification).
- **Language-independent.** The rules live in `data/` as YAML, validated by JSON Schema. PHP and JS read the same compiled rules; a test checks that both produce byte-identical JSON for every country, region and year in 2000–2050.
- **Detailed.** Regions (ISO 3166-2), half days with a start time, substitute days, and whether a day is a statutory day off (`public`), a bank holiday (`bank`) or a custom (`observance`).

Dates are plain calendar dates (`YYYY-MM-DD`), without time zones.

## Countries

| Country | Regions | Notes |
|---|---|---|
| Switzerland (CH) | 26 cantons | `public` = equal to Sunday under the Labour Act (ArG Art. 20a); see [verification](docs/verification/ch.md) |
| Liechtenstein (LI) | 11 municipalities | `public` = Labour Act Art. 18; see [verification](docs/verification/li.md) |
| United Kingdom (GB) | England, Northern Ireland, Scotland, Wales | `public` = bank holiday (1971 Act, Royal Proclamations), with substitute days; see [verification](docs/verification/gb.md) |
| Ireland (IE) | none | `public` = Organisation of Working Time Act 1997, Sch. 2; no substitute days; see [verification](docs/verification/ie.md) |

More Western European countries follow in the same format.

## PHP

```sh
composer require craftsmith/holidays
```

PHP 8.2 or later, no dependencies.

```php
use craftsmith\holidays\Holidays;

$holidays = new Holidays();

$holidays->isHoliday('2026-08-01', 'CH');                 // true (nationwide)
$holidays->isHoliday('2026-01-02', 'CH', 'ZH');           // false: a custom in Zurich, not a statutory day off
$holidays->isHoliday('2026-01-02', 'CH', 'ZH', ['public', 'observance']); // true

foreach ($holidays->holidays('CH', 2026, 'SO') as $day) {
    echo $day['date'], ' ', $day['name']['de'], $day['startTime'] ? ' ab ' . $day['startTime'] : '', "\n";
}
// 2026-05-01 Tag der Arbeit ab 12:00 …

$holidays->next('2026-12-24', 'CH', 'CH-BE');             // ['date' => '2026-12-25', 'id' => 'ch.christmas', …]
$holidays->regions('CH');                                  // [['code' => 'CH-AG', 'names' => […]], …]
$holidays->year('CH', 2026);                               // the full year document, same as the JSON file
```

## JavaScript and TypeScript

```sh
npm install @craftsmith/holidays
```

ESM, no dependencies, Node 18+ and browsers. Types included.

```js
import { isHoliday, holidays, next, countries, Holidays } from '@craftsmith/holidays';

isHoliday('2026-08-01', 'CH');                              // true
holidays('LI', 2026);                                       // the 13 statutory days of Liechtenstein
next('2026-12-24', 'CH', 'BE');                             // { date: '2026-12-25', id: 'ch.christmas', … }
new Holidays().year('CH', 2026);                            // the full year document
```

## API

Both runtimes have the same methods, arguments and results. A region is `ZH` or `CH-ZH`; `types` defaults to `['public']`.

| Method | Returns |
|---|---|
| `countries()` | countries with names, languages and regions |
| `regions(country)` | regions of a country |
| `year(country, year)` | the full year document (all regions, all types, sources) |
| `holidays(country, year, region?, types?)` | the holidays of a year; without a region only the nationwide ones |
| `isHoliday(date, country, region?, types?)` | `true` or `false` |
| `next(date, country, region?, types?)` | the first holiday after the date, or `null` |
| `previous(date, country, region?, types?)` | the last holiday before the date, or `null` |

A holiday:

```json
{
  "date": "2026-05-01",
  "id": "ch.labour-day",
  "name": {"en": "Labour Day", "de": "Tag der Arbeit", "fr": "Fête du travail", "it": "Festa del lavoro"},
  "type": "public",
  "startTime": "12:00",
  "substituteFor": null,
  "nationwide": false,
  "regions": ["CH-SO"],
  "sources": ["seco-art20a"]
}
```

`id` is stable across years and releases, so you can map it to your own data. `startTime` is set for partial days, `substituteFor` for substitute days.

## Without code

The precomputed files cover 2000–2050:

```
dist/json/index.json              countries, regions, year range
dist/json/<cc>/<year>.json        all holidays of a country in a year
```

They are served by jsDelivr from GitHub, for example:

```
https://cdn.jsdelivr.net/gh/craftsmithDev/holidays@main/dist/json/index.json
https://cdn.jsdelivr.net/gh/craftsmithDev/holidays@main/dist/json/ch/2026.json
```

Use a release tag instead of `main` in production. To get one region from a year file, keep the entries where `nationwide` is `true` or `regions` contains the region. The schema is in [schema/year.schema.json](schema/year.schema.json).

## Data

The rules are in `data/<cc>/` and documented in [docs/format.md](docs/format.md). Modelling choices are in [docs/decisions.md](docs/decisions.md). To add a country or fix a date, see [CONTRIBUTING.md](CONTRIBUTING.md).

The dates are compiled from the official sources cited in the data. They are checked against the OpenHolidays API and the date-holidays package, but those are not sources. Laws change: check the cited source before relying on a date for legal or payroll purposes.

## Licence

MIT, © craftsmith. See [LICENSE](LICENSE).
