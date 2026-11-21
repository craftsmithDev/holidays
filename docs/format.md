# Data format

This is the reference for the rule files `countries/<cc>/rules.yaml` and the translation files `translations/<lang>.yaml`. Both runtimes (PHP and JS) implement exactly what this page says, and `tests/fixtures/expectations.json` checks it in both. If this page and the code disagree, the code has a bug.

Format version: **1**. It describes the compiled rules and the output files, which consumers read. Additive changes (a new optional field, a new rule type, a new region, a new language) keep version 1. Removing or renaming a field of these files, or changing what an existing field means, would need version 2. The rule files moved their country names, languages and region names to craftsmith/regions (docs/decisions.md D16) without a change to the compiled files, so the version stayed 1.

## Files

```
countries/
  <cc>/                 lower-case ISO 3166-1 alpha-2 code, e.g. ch
    rules.yaml          country code, region codes, source catalogue, holidays
    sources.md          the sources explained, the verification, the comparison with external data
  _template/            copy this to start a country (ignored by the build)
translations/
  <lang>.yaml           holiday names in one language for countries where it is not a local language
schema/
  rules.schema.json     validates rules.yaml
  translation.schema.json validates <lang>.yaml
  year.schema.json      describes json/<cc>/<year>.json
  index.schema.json     describes json/index.json
```

Country names, the local languages and region names come from craftsmith/regions, a dev dependency of the build (docs/decisions.md D16). The test fixtures and the template use invented countries; their names are in `tests/fixtures/regions.json`.

`npm run build` validates every file and writes:

| Output | Contents | Used by |
|---|---|---|
| `src/data/<cc>.json` | rules.yaml as JSON with the format version, without comments; with the country name, languages and region names from craftsmith/regions and the translations merged into the holiday names | PHP runtime |
| `js/data/<cc>.js` | the same rules as an ES module | JS runtime |
| `json/<cc>/<year>.json` | computed holidays, 2025–2036 | anyone, also via jsDelivr |
| `json/index.json` | countries, regions, year range | anyone |

The runtimes compute any year from the rules; the year files are a convenience for a short window (the previous year to ten years ahead).

### YAML dialect

The build parses YAML with the JSON schema of js-yaml. In practice:

- Unquoted `2026-11-15` stays a string (no date type). Quote dates anyway, the template does.
- `NO`, `yes`, `on` stay strings. Only `true` and `false` are booleans. (Norway is safe.)
- Numbers must be plain integers: `month: 8`, not `month: 08` (a leading zero makes it a string and the schema rejects it).
- Duplicate keys are an error.
- Times must be quoted: `startTime: "12:00"`.

## rules.yaml: country

The first part of the file describes the country.

```yaml
code: CH                                   # ISO 3166-1 alpha-2, upper case, equals the folder name
regions:                                   # ISO 3166-2 codes; [] if never needed
  - CH-ZH
sources:                                   # catalogue; holidays cite these ids
  seco-art20a:
    title: "Anhang: Feiertage Schweiz (Auszug ArG/ArGV 1–5), Stand am 12.12.2024"
    publisher: State Secretariat for Economic Affairs SECO
    law: SR 822.11, ArG Art. 20a para. 1
    url: https://www.seco.admin.ch/…
    accessed: "2026-11-15"
```

| Field | Required | Meaning |
|---|---|---|
| `code` | yes | ISO 3166-1 alpha-2, upper case. Must be a country of craftsmith/regions, which gives its names and its local languages (`languages`, most used first). Every holiday name must exist in each local language and in `en`. |
| `regions` | yes | List of full ISO 3166-2 codes (`CH-ZH`, `GB-SCT`, `ES-AN`) that the holidays use. Each must exist in craftsmith/regions, which gives the names. Use `[]` when holidays never differ by region. |
| `sources` | yes | Map of source id → source. Ids are lower case with `-`. Every id must be cited at least once, and every cited id must exist. |

A source:

| Field | Required | Meaning |
|---|---|---|
| `title` | yes | Title of the document or page in its own language. |
| `url` | yes | Where to read it. Official where possible (law gazette, ministry). |
| `accessed` | yes | The day you read it, `"YYYY-MM-DD"`. |
| `publisher` | no | Authority or organisation. |
| `law` | no | Legal citation, e.g. `SR 822.11, ArG Art. 20a para. 1`, `Banking and Financial Dealings Act 1971, Sch. 1`. |

## rules.yaml: holidays

The second part lists the holidays.

```yaml
holidays:
  - id: ch.national-day
    names: {en: Swiss National Day, de: Bundesfeier, fr: Fête nationale, it: Festa nazionale, rm: Festa naziunala}
    date: {type: fixed, month: 8, day: 1}
    observances:
      - regions: all
        type: public
        sources: [federal-constitution, seco-art20a]
```

A holiday is **one date rule** plus **one or more observances**. The date rule says when; an observance says where, how (type, part of the day, substitute) and since when, and cites its sources.

### Holiday fields

| Field | Required | Meaning |
|---|---|---|
| `id` | yes | Stable id `<cc>.<slug>`: lower case, words joined by `-`. Never change or reuse an id once published; consumers map it. |
| `names` | yes | `en` plus every local language of the country (from craftsmith/regions). Use the official local name; English as commonly used in that country. Further languages with an official name are allowed (`cy` in GB, `ca`, `eu`, `gl` in ES). Other languages go to `translations/`. |
| `date` | yes | A rule, or a list of rules with non-overlapping `from`/`to` when a law moved the date. |
| `observances` | yes | One or more observances (below). |
| `from`, `to` | no | First and last year (inclusive) the holiday exists at all. |
| `sources` | no | Sources for the date rule itself. They are added to the sources of every observance in the output. |
| `note` | no | Free text for maintainers and readers of the rules. Not in the year files. |

The order of holidays in the file is the order of same-day holidays in the output.

### Observance fields

| Field | Required | Meaning |
|---|---|---|
| `regions` | yes | `all` (whole country) or a list of region codes from `regions`. |
| `except` | no | Region codes that opt out. Only together with `regions: all`. |
| `type` | yes | `public`, `bank` or `observance` (below). |
| `startTime` | no | Partial day: the day off starts at this local time, `"HH:MM"`. Omit for a whole day. |
| `from`, `to` | no | Years (inclusive) this observance is valid. |
| `years` | no | Only in these years. For days set by decree each year. |
| `date` | no | Overrides the holiday's date rule in these regions. |
| `adjust` | no | Conditional changes after the date rule (see [adjust](#adjust-conditional-changes)). |
| `substitute` | no | Adds a substitute day under a condition (see [substitute](#substitute-days)). |
| `sources` | yes | One or more source ids. |
| `note` | no | Free text. Say here when a day is statutory only in parts of a region. |

#### Types

| Type | Meaning | Example |
|---|---|---|
| `public` | Statutory day off: the law makes it a rest day for employees (or equal to Sunday). | Swiss National Day; UK bank holidays (they are the general public holidays there) |
| `bank` | Banks and financial markets close by law or by the banking calendar, but it is not a general day off. | TARGET2 closing days; a bank-only day |
| `observance` | Customary or optional, or a rest day under some other law, but not a statutory day off for employees. | Berchtold’s Day in Zurich; Christmas Eve in many countries |

Write down your country’s line between `public` and `observance` at the top of `rules.yaml` (see `countries/ch/rules.yaml`), so that the next person classifies new days the same way. Mark partial days with `startTime` and keep the type: an afternoon off by law is `public` with `startTime: "12:00"`.

#### Which observance applies

For one region and one year, the runtime looks at the observances that are valid that year (`from`, `to`, `years`):

1. An observance whose `regions` lists the region wins.
2. Otherwise an observance with `regions: all` applies, unless the region is in its `except`.
3. Otherwise the holiday does not apply in that region.

Two valid observances on the same level for the same region and year are a data error; the build fails and names them. The order of observances in the file does not matter.

So a region-specific observance overrides the national one (other type, half day, other date). To remove a region from a national holiday, use `except`.

## Date rules

Every rule has a `type`. All types except `list` also accept:

| Field | Meaning |
|---|---|
| `offset` | Days added after the rule (negative allowed). |
| `adjust` | Conditional changes, applied after `offset`. |
| `from`, `to` | Years the rule is valid; only used when `date` is a list. |

The runtime computes the rule for the year asked and keeps only dates in that year.

### fixed

```yaml
date: {type: fixed, month: 12, day: 25}
```

`29 February` yields no date in common years.

### easter

```yaml
date: {type: easter, offset: -2}                      # Good Friday
date: {type: easter, offset: 39}                      # Ascension
date: {type: easter, calendar: orthodox, offset: 1}   # Orthodox Easter Monday
```

`calendar`: `western` (default, Gregorian computus) or `orthodox` (Julian computus, returned as a Gregorian date). Common offsets: Shrove Tuesday −47, Ash Wednesday −46, Maundy Thursday −3, Good Friday −2, Easter Monday 1, Ascension 39, Whit Sunday 49, Whit Monday 50, Corpus Christi 60.

### nthWeekday

```yaml
date: {type: nthWeekday, month: 5, weekday: mon, nth: -1}            # last Monday of May
date: {type: nthWeekday, month: 9, weekday: sun, nth: 3, offset: 1}  # Monday after the 3rd Sunday of September
```

`nth`: 1 to 5 from the start of the month, −1 to −5 from the end. A 5th weekday that does not exist yields no date. `weekday`: `mon tue wed thu fri sat sun`.

### relativeWeekday

The given weekday relative to another rule.

```yaml
# Midsummer Eve (SE): the Friday between 19 and 25 June
date: {type: relativeWeekday, weekday: fri, direction: onOrAfter, base: {type: fixed, month: 6, day: 19}}
```

`direction`: `onOrAfter`, `after` (strictly), `onOrBefore`, `before` (strictly). `base` is any rule.

### list

Explicit dates. Use it for one-off days (a royal wedding, a state funeral) and for days set by decree each year.

```yaml
date: {type: list, dates: ["2026-06-12"]}
```

The holiday exists only in years that have a date in the list; add a year when its decree is published. `list` takes no `offset` or `adjust`.

### A date rule that changed

```yaml
date:
  - {type: fixed, month: 5, day: 5, to: 2009}
  - {type: nthWeekday, month: 5, weekday: mon, nth: 1, from: 2010}
```

Exactly one rule may be valid in any year; overlaps fail the build.

## adjust: conditional changes

`adjust` is a list. For each date, the first entry whose `when` holds is applied, and only that one. It can sit on the date rule (applies everywhere) or on an observance (applies in its regions, after the rule’s own adjust).

Actions, exactly one per entry:

| Action | Effect |
|---|---|
| `offset: 7` | Move by n days. |
| `skip: true` | No holiday that year. |
| `moveTo: {weekday: mon, direction: after}` | Move to the weekday relative to the date. |

Conditions in `when` (all given keys must hold):

| Condition | Holds when |
|---|---|
| `weekday: [sat, sun]` | the date falls on one of the weekdays |
| `sameDateAs: <rule>` | the date equals that rule’s date in the same year |
| `between: {from: <rule>, to: <rule>}` | the date is in the range, both ends inclusive |

## Substitute days

A substitute adds a second, extra day; the original date stays in the list. (To move the holiday itself, use `adjust`.)

```yaml
substitute: {when: {weekday: [sat, sun]}, avoidWeekdays: [sat, sun]}
```

When `when` holds on the date, the substitute is the first later day that

- is not on a weekday in `avoidWeekdays`, and
- is not already a whole-day `public` holiday or an earlier substitute in the same region.

Substitutes are assigned in date order, then file order, so they chain: in the UK, Christmas on a Saturday goes to Monday 27, and Boxing Day on the Sunday goes to Tuesday 28 because Monday is taken. A substitute for 31 December can land on 2 January of the next year; the runtime looks at the previous year to find it.

Output: the substitute has the same `id` and names, and `substituteFor` holds the original date.

`avoidWeekdays: []` means simply the next free day (Neuchâtel: 2 January when 1 January is a Sunday).

## The hard cases, modelled

### Swiss Federal Fast Monday

Monday after the third Sunday of September.

```yaml
date: {type: nthWeekday, month: 9, weekday: sun, nth: 3, offset: 1}
```

### Näfelser Fahrt (CH-GL)

First Thursday of April, one week later when that Thursday falls in Holy Week (Palm Sunday to Holy Saturday). 2026 → 9 April; 2027 → 1 April (Easter week, no shift).

```yaml
date:
  type: nthWeekday
  month: 4
  weekday: thu
  nth: 1
  adjust:
    - when: {between: {from: {type: easter, offset: -7}, to: {type: easter, offset: -1}}}
      offset: 7
```

### A day not observed when it would make three rest days (AR, AI)

Saint Stephen is skipped when Christmas is a Monday or Friday, i.e. when 26 December is a Tuesday or Saturday.

```yaml
- regions: [CH-AI, CH-AR]
  type: public
  adjust:
    - when: {weekday: [tue, sat]}
      skip: true
  sources: [seco-art20a]
```

### UK/IE style substitute with chaining

Put the same `substitute` on each holiday (see above).

### Sunday holiday moved to Monday (no extra day)

`adjust: [{when: {weekday: [sun]}, moveTo: {weekday: mon, direction: after}}]`

### Half day

`startTime: "12:00"` on the observance (Solothurn: Labour Day afternoon).

### A region with a different status

A second observance for that region, e.g. Labour Day `public` in BL, BS, JU, NE, SH, ZH; `public` from 12:00 in SO; `observance` in TI.

### Spain: holidays set by decree each year

Each autonomous community chooses some days each year, and moves Sunday holidays to Monday by decree. Model the national list with normal rules, then per community and year:

```yaml
- id: es.saint-joseph
  names: {en: Saint Joseph’s Day, es: San José}
  date: {type: fixed, month: 3, day: 19}
  observances:
    - regions: [ES-MC, ES-VC]
      type: public
      years: [2025, 2026]
      sources: [boe-2025, boe-2026]

- id: es.epiphany
  names: {en: Epiphany, es: Epifanía del Señor}
  date: {type: fixed, month: 1, day: 6}
  observances:
    - {regions: all, type: public, sources: [boe-2026]}
    - regions: [ES-AN]                      # a community moved it by decree in one year
      type: public
      years: [2030]
      date: {type: list, dates: ["2030-01-07"]}
      sources: [boe-2030]
```

### One-off day

`date: {type: list, dates: ["2023-05-08"]}` with a single observance.

### A law that ends or starts a holiday

`from`/`to` on the holiday or on the observance (e.g. Denmark abolished Great Prayer Day after 2023: `to: 2023`).

## translations/&lt;lang&gt;.yaml

Holiday names in one of the plugin languages (de, fr, it, es, nl, pl, pt, ru, tr, rm) for the countries where it is not a local language.

```yaml
language: de
countries:
  FR:
    holidays:
      fr.new-year: Neujahr
      fr.armistice-day: Waffenstillstand 1918
```

| Field | Meaning |
|---|---|
| `language` | BCP 47 tag, equals the file name. |
| `countries.<CC>.holidays` | Holiday id → name. |

Rules, all checked by the build: every country and id must exist; a translation may not name a holiday in a local language of its country (that name belongs in `rules.yaml`), nor repeat a name `rules.yaml` has. There is no `en.yaml`: English is required in every rule file. The build adds the translations to the holiday's `names`, after the names of `rules.yaml`, in alphabetical order of the language. Which names were written by a person from a source and which are machine-written is in docs/coverage.md.

## Output: year files

`json/<cc>/<year>.json`, schema `schema/year.schema.json`. Both runtimes return this exact document from `year()`, byte for byte when encoded.

```json
{
  "format": 1,
  "country": "CH",
  "year": 2026,
  "holidays": [
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
  ],
  "sources": {"seco-art20a": {"title": "…", "url": "…", "accessed": "2026-11-15"}}
}
```

How entries are built:

1. The runtime computes each region separately (a country without regions is computed once).
2. Entries with the same date, id, type, `startTime` and `substituteFor` are merged; `regions` lists where they apply, in the order of `regions`.
3. `nationwide` is true when an entry applies in every region (or the country has no regions); `regions` is then `[]`.
4. `sources` is the union of the holiday’s and the observances’ sources, in catalogue order. The top-level `sources` holds the cited entries.
5. Sorted by date, then file order, then originals before substitutes, then type (`public`, `bank`, `observance`).

Encoding: UTF-8, 2-space indent, no escaped slashes or non-ASCII characters, final newline.

To get the holidays of one region from a year file, keep the entries where `nationwide` is true or `regions` contains the region. The runtimes’ `holidays()` does exactly that.

## Reserved for later (no breaking change needed)

- Municipal level. An optional `parent` field on regions, and region codes below ISO 3166-2 (e.g. `CH-ZH-261` with the Swiss municipality number). Observances could then list municipalities. Today the schema rejects `parent`, so nobody uses it by accident.
- School holidays. Separate files (`countries/<cc>/school.yaml`) with date ranges and their own schema and output folder. They will not change the holiday files.
- More rule types or conditions. New `type` values and new `when` keys are additive.
- `endTime` for a partial day that ends early. Not needed so far.
