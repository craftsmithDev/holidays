# craftsmith/holidays

Public holidays for 18 Western European countries, national and regional, with the legal source for every day. One set of rule files, a PHP package and a JS package that compute the same results, and precomputed JSON files for use without code.

Why another holiday library:

- **Sourced.** Every holiday cites the law or official page it comes from, with URL and the date it was read. Each country has a `sources.md` that explains the sources, how the data was checked, and every difference with two external datasets (OpenHolidays API, date-holidays).
- **Language-independent.** The rules are YAML files, validated by JSON Schema. PHP and JS read the same compiled rules, and a test checks that both produce byte-identical JSON for every country, region and year from 2000 to 2050.
- **Typed.** Each day says whether it is a statutory day off (`public`), a bank holiday (`bank`) or a custom (`observance`). Half days carry a start time, substitute days point to the day they replace.

Dates are plain calendar dates (`YYYY-MM-DD`), without time zones.

## Countries

| Country | Regions | Notes |
|---|---|---|
| Switzerland (CH) | 26 cantons | `public` = equal to Sunday under the Labour Act (ArG Art. 20a); see [sources](countries/ch/sources.md) |
| Liechtenstein (LI) | 11 municipalities | `public` = Labour Act Art. 18; see [sources](countries/li/sources.md) |
| Germany (DE) | 16 Länder | `public` = gesetzlicher Feiertag in the whole Land under its Feiertagsgesetz; see [sources](countries/de/sources.md) |
| Austria (AT) | 9 Bundesländer | `public` = Feiertag under the Arbeitsruhegesetz (ARG § 7); see [sources](countries/at/sources.md) |
| France (FR) | Alsace-Moselle departments and the overseas territories with their own days (10) | `public` = jour férié under the Code du travail; see [sources](countries/fr/sources.md) |
| Monaco (MC) | none | `public` = Loi n° 798; Sunday rule as substitute days; see [sources](countries/mc/sources.md) |
| Italy (IT) | 19 regions + the autonomous provinces Bolzano and Trento | `public` = Legge 260/1949 as amended (4 October from 2026); Whit Monday in South Tyrol as `observance`; no patron-saint days; see [sources](countries/it/sources.md) |
| San Marino (SM) | 9 castelli | `public` = Legge 152/1990; see [sources](countries/sm/sources.md) |
| Vatican City (VA) | none | `public` = days off under the personnel regulations of the Holy See and the Governatorato; see [sources](countries/va/sources.md) |
| Spain (ES) | 17 communities, Ceuta, Melilla | `public` = fiesta laboral in the yearly BOE resolution, 2000–2027; see [sources](countries/es/sources.md) |
| Andorra (AD) | 7 parishes | `public` = yearly labour calendar decree, 2024–2027; see [sources](countries/ad/sources.md) |
| Malta (MT) | none | `public` = National Holidays and public holidays of Cap. 252; no substitute days; see [sources](countries/mt/sources.md) |
| Portugal (PT) | 18 districts, Azores, Madeira | `public` = Labour Code Art. 234 and regional decrees; Carnival is an `observance`; see [sources](countries/pt/sources.md) |
| United Kingdom (GB) | England, Northern Ireland, Scotland, Wales | `public` = bank holiday (1971 Act, Royal Proclamations), with substitute days; see [sources](countries/gb/sources.md) |
| Ireland (IE) | none | `public` = Organisation of Working Time Act 1997, Sch. 2; no substitute days; see [sources](countries/ie/sources.md) |
| Belgium (BE) | 3 regions | `public` = the ten days of the Holidays Act 1974; see [sources](countries/be/sources.md) |
| Netherlands (NL) | 12 provinces, 3 Caribbean special municipalities | `public` = Algemene termijnenwet Art. 3 day that is a general day off, Arbeidswet 2000 BES in the Caribbean Netherlands; see [sources](countries/nl/sources.md) |
| Luxembourg (LU) | none | `public` = Code du travail Art. L. 232-2; see [sources](countries/lu/sources.md) |

Regions are ISO 3166-2 codes; their names, the country names and the local languages come from craftsmith/regions. The `sources.md` of each country lists the laws, the checks and the open points.

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
// 2026-01-01 Neujahr
// 2026-04-03 Karfreitag
// 2026-05-01 Tag der Arbeit ab 12:00 …

$holidays->next('2026-12-24', 'CH', 'CH-BE');             // ['date' => '2026-12-25', 'id' => 'ch.christmas', …]
$holidays->regions('DE');                                  // [['code' => 'DE-BB', 'names' => […]], …]
$holidays->name('ch.national-day', 'rm');                  // 'Festa naziunala'
$holidays->year('GB', 2027);                               // the full year document, same as json/gb/2027.json
```

## JavaScript and TypeScript

```sh
npm install @craftsmith/holidays
```

ESM, no dependencies, Node 18+ and browsers. Types included.

```js
import { isHoliday, holidays, next, countries, Holidays } from '@craftsmith/holidays';

isHoliday('2026-10-31', 'DE', 'BB');                        // true: Reformation Day in Brandenburg
holidays('LI', 2026);                                       // the 13 statutory days of Liechtenstein
holidays('GB', 2027, 'SCT').filter((h) => h.substituteFor); // 4 Jan for 2 Jan, 27 Dec for 25 Dec, 28 Dec for 26 Dec
next('2026-12-24', 'CH', 'BE');                             // { date: '2026-12-25', id: 'ch.christmas', … }
new Holidays().year('ES', 2026);                            // the full year document
```

Both packages contain the compiled rules and compute any year from 1583 to 9999. Where the days are set by a yearly decree, the coverage follows the published decrees: Spain 2000–2027 in full (from 2028 only the national days the communities cannot replace), Andorra 2024–2027.

## API

Both runtimes have the same methods, arguments and results. A region is `ZH` or `CH-ZH`; `types` defaults to `['public']`.

| Method | Returns |
|---|---|
| `countries()` | countries with names, languages and regions |
| `regions(country)` | regions of a country |
| `name(id, language)` | the name of a holiday in a language (`de-CH`, then `de`, then English), or `null` for an unknown id |
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
  "name": {"en": "Labour Day", "de": "Tag der Arbeit", "fr": "Fête du travail", "it": "Festa del lavoro", "rm": "Di da la lavur", "es": "Fiesta del Trabajo", "…": "…"},
  "type": "public",
  "startTime": "12:00",
  "substituteFor": null,
  "nationwide": false,
  "regions": ["CH-SO"],
  "sources": ["seco-art20a"]
}
```

`id` is stable across years and releases, so you can map it to your own data. Names are given in English, in every local language of the country, and in German, French, Italian, Spanish, Dutch, Polish, Portuguese, Russian, Turkish and Romansh. The local names come from the official sources, except the Romansh names of Switzerland, which are machine-written. The other languages are in `translations/` and are machine-written too; see [docs/coverage.md](docs/coverage.md). Country and region names come from [craftsmith/regions](https://github.com/craftsmithDev/regions).

## How holidays are typed

| Type | Meaning |
|---|---|
| `public` | A statutory day off for employees (in Switzerland: equal to Sunday under the Labour Act). What counts as `public` is written at the top of each country's `rules.yaml` and in its row above. |
| `bank` | Banks close, but it is not a general day off. |
| `observance` | Customary, optional, or a day off only for some employees or in part of a region. The `note` in the rules says for whom. |

- **Half days** keep their type and add `startTime`, the local time the day off starts (Labour Day in Solothurn from `12:00`).
- **Substitute days** are extra entries with the same `id` and `substituteFor` set to the original date. The original stays in the list.
- **Regional days** have `nationwide: false`, and `regions` lists where they apply. `holidays()` without a region returns only the nationwide days.
- **Sunday holidays** such as Easter Sunday and Whit Sunday are not listed, unless a Sunday has a legal effect in that country.

Modelling choices are explained in [docs/decisions.md](docs/decisions.md); the full format is in [docs/format.md](docs/format.md).

## Without code

The precomputed files cover **2025–2036**, the previous year to ten years ahead. For other years, use one of the packages.

```
json/index.json              countries, regions, year range
json/<cc>/<year>.json        all holidays of a country in a year
```

jsDelivr serves them from GitHub:

```
https://cdn.jsdelivr.net/gh/craftsmithDev/holidays@1.0.0/json/index.json
https://cdn.jsdelivr.net/gh/craftsmithDev/holidays@1.0.0/json/ch/2026.json
```

To get one region from a year file, keep the entries where `nationwide` is `true` or `regions` contains the region. The schema is in [schema/year.schema.json](schema/year.schema.json).

## Scope

- Country and region level (ISO 3166-1 and 3166-2). No municipal holidays: a day that only some municipalities keep is left out, or listed at region level as an `observance` with a note.
- Public holidays only. No school holidays yet.
- External datasets are a cross-check, not a source. Laws change: check the cited source before you rely on a date for legal or payroll purposes.

## Repository

```
countries/<cc>/rules.yaml    the rules of one country: regions, sources, holidays
countries/<cc>/sources.md    the sources explained, the verification, the comparison with external data
translations/<lang>.yaml     holiday names in the plugin languages for countries where they are not local
countries/_template/         start here for a new country
src/                         PHP runtime (src/data: compiled rules)
js/                          JS runtime (js/data: compiled rules)
json/                        precomputed year files 2025–2036
schema/                      JSON Schemas for the rules and the output
scripts/                     build, comparison, cross-runtime dump
docs/                        format reference, decisions, translation coverage
```

## Contributing

To add a country, fix a date or add a source, see [CONTRIBUTING.md](CONTRIBUTING.md). Every holiday needs an official source; the build rejects rules without one.

## Contributors

- craftsmith (wedot)
- Claude (Anthropic)

## Licence

MIT, © craftsmith. See [LICENSE](LICENSE).
