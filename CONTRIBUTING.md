# Contributing

The data is the product. Every holiday must be traceable to a source someone can open and read. Code changes are welcome too, but they must keep the PHP and JS runtimes identical (the cross-runtime test checks every byte).

Setup (the build reads country and region names from craftsmith/regions, a dev dependency that points to `../regions` until it is published; check it out next to this folder):

```sh
npm ci
composer install
npm run build        # validate countries/ and regenerate src/data/, js/data/, json/
npm test             # JS tests: schema, rules, golden, dist
npm run test:types   # TypeScript declarations
vendor/bin/phpunit   # PHP tests, including the cross-runtime comparison 2000–2050 (needs node)
```

## Adding a country

1. **Copy the template.** `cp -r countries/_template countries/<cc>` with the lower-case ISO 3166-1 alpha-2 code. Read [docs/format.md](docs/format.md) once in full; it has a section on the hard cases (substitute days, decree tables, conditional shifts).
2. **Find the sources first.** Collect the legal basis before you write a rule: the holiday act or labour law, the official gazette, the ministry page. Put each into `sources` in `rules.yaml` with title, URL, the law citation and the day you read it.
3. **Decide what `public` means in your country.** Usually: a statutory day off for employees. Write one sentence at the top of `rules.yaml` (see `countries/ch/rules.yaml` and `countries/li/rules.yaml`), then classify every day by it. A day that is statutory only in part of a region is an `observance` with a note (decision D6 in [docs/decisions.md](docs/decisions.md)).
4. **Regions.** List the ISO 3166-2 codes of the subdivisions that have their own holidays (in Germany the 16 Länder, in Spain the 19 communities and cities, in the UK `GB-ENG`, `GB-NIR`, `GB-SCT`, `GB-WLS`). Codes only: the names, the country name and the local languages come from craftsmith/regions, and each code must exist there. If no holiday differs by region, use `regions: []`.
5. **Write the holidays.** One entry per holiday, in calendar order. Reuse the id slugs below so that the same holiday has the same slug in every country.
6. **Build and test.** `npm run build` lists every problem with file and field. Then `npm test` and `vendor/bin/phpunit`.
7. **Compare.** `node scripts/compare.mjs <CC> --from 2024 --to 2030` writes the comparison to the end of `countries/<cc>/sources.md` (everything below the marker line is replaced on each run). It needs network access for OpenHolidays (`--offline` skips it).
8. **Explain every difference** in `countries/<cc>/sources.md`, above the marker line: the sources, who is right and why. Use `countries/ch/sources.md` as the pattern. A difference you cannot explain is an open point; list it, do not guess.
9. **Add a few expectation cases** for the hard cases of your country to `tests/fixtures/expectations.json` (a substitute day, a regional half day, a shifted date). Both runtimes run them.
10. **Update the README** table of covered countries.

### Id slugs

Ids are `<cc>.<slug>`. Use these slugs where they fit; add new ones in the same style (English, lower case, `-`).

| Slug | Holiday |
|---|---|
| `new-year` | 1 January |
| `epiphany` | 6 January |
| `good-friday`, `easter-monday`, `ascension`, `whit-monday`, `corpus-christi` | Easter-based days |
| `labour-day` | 1 May |
| `assumption` | 15 August |
| `all-saints` | 1 November |
| `immaculate-conception` | 8 December |
| `christmas-eve`, `christmas`, `new-years-eve` | 24, 25, 31 December |
| `saint-stephen` | 26 December; use `boxing-day` where that is the local name (GB, IE) |
| `national-day` | the country’s national day |

Never rename an id after it was released. If a holiday is split or merged by law, end the old one with `to` and start a new id.

## Source rules

- **Official first.** Law texts, official gazettes, ministries, statistics offices. A government calendar page is fine when it states the law.
- **Every observance cites at least one source.** The build rejects observances without one, sources that are never cited, and citations of unknown ids.
- **`accessed`** is the day you actually read the source. Update it when you re-check.
- **External datasets are not sources.** OpenHolidays, date-holidays, Wikipedia and commercial calendars are for the comparison report only. If they show a day you cannot find in an official source, it does not go in; it goes into the open points.
- **No guessing.** If the law is unclear (a day equal to Sunday only for some workers, a decree not yet published), model what the source says, put the rest in a `note`, and list it as an open point in `sources.md`. Modelling questions that affect other countries go to `docs/decisions.md`.
- **Names in `rules.yaml`.** Every local language and English. Use the name the official source uses; do not translate yourself into a language you cannot check.
- **Translations.** `translations/<lang>.yaml` holds the names in the other plugin languages (de, fr, it, es, nl, pl, pt, ru, tr, rm); a new country needs a name in each. Mark every name you did not take from a source in [docs/coverage.md](docs/coverage.md) as machine-written.

## Verification checklist

Before you open a pull request:

- [ ] `npm run build` passes and the generated files are committed (`src/data/`, `js/data/`, `json/`).
- [ ] `npm test`, `npm run test:types` and `vendor/bin/phpunit` pass.
- [ ] Every holiday has names in `en` and every local language in `rules.yaml`, and in the other plugin languages in `translations/`.
- [ ] Every observance cites a source with URL and accessed date; the law citation is filled where there is a law.
- [ ] The type rule of the country is written at the top of `rules.yaml`.
- [ ] Regional exceptions, half days and substitute days are modelled with fields, not only in notes.
- [ ] `countries/<cc>/sources.md` explains every difference in its comparison section.
- [ ] At least two years were checked by hand against an official calendar (one with a moved or substitute day, if the country has them).
- [ ] New expectation cases cover the hard cases.
- [ ] The README lists the country.

## Changing the format or the runtimes

- A format change starts in [docs/format.md](docs/format.md) and the schemas, then both runtimes, then `tests/fixtures/` (a fixture country that uses the new feature) and `tests/fixtures/expectations.json`.
- Additive changes only within format version 1 (new optional fields, new rule types, new conditions).
- `js/engine.js` and `src/Engine.php` are kept parallel, function by function. Change both in the same commit.
