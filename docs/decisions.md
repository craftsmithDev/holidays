# Decisions

Modelling questions without one obvious answer, how this library answers them, and why. The owner reviews these; change them here first, then in the code and data.

## D1 YAML as the source format, JSON for everything else

The rule files are YAML: contributors write and review them by hand, and YAML allows comments next to a legal nuance. The YAML traps (dates turned into timestamps, `NO` turned into `false`, `08` read as octal) are closed by parsing with the JSON schema of js-yaml, and the JSON Schema rejects anything else. The build converts YAML to JSON once (`dist/rules/<cc>.json`), so neither runtime needs a YAML parser and the PHP package has no dependency at all.

## D2 The runtimes evaluate rules; the year files are a by-product

Both runtimes read the compiled rules and compute any year in the range 1583–9999 (the Gregorian calendar starts in 1583). The precomputed files (2000–2050) are for consumers without a runtime. Shipping only year files would cap the range and double the data in each package.

## D3 Integer day numbers, no Date objects

All arithmetic runs on integer day numbers (days since 1970-01-01, proleptic Gregorian). This removes time zones and daylight saving from the problem and makes PHP and JS produce the same result by construction. Inputs are `YYYY-MM-DD` strings; a PHP `DateTimeInterface` or a JS `Date` is read in its own (local) time zone.

## D4 Three types, partial days as a time

`type` is one of `public`, `bank`, `observance`; a partial day is the same type plus `startTime`. A day that is statutory only for some employees, or only in part of a region, is an `observance` at that level, with a note naming who or where (see D6). The alternative, a fourth type such as `partial-public`, would mix two questions (is it a day off, and for whom) in one field.

## D5 Switzerland: public means equal to Sunday under ArG Art. 20a

Swiss cantons decide their holidays; the Labour Act (Art. 20a) lets each canton equate at most eight of them with Sunday, plus 1 August. The SECO list of these days is the most uniform official source for all 26 cantons, so `public` in CH means: in the SECO list for that canton (or 1 August). Every other cantonal holiday is an `observance`, even when cantonal law calls it a rest day (e.g. Whit Monday in Glarus, see verification/ch.md). The note on each observance says which.

## D6 Days equal to Sunday in only part of a canton

Aargau, Fribourg, Solothurn and Neuchâtel equate some days with Sunday only in some districts or municipalities. Until the municipal level exists, such a day appears at canton level as an `observance` with a note naming the parts. Anyone who needs the exact municipality gets the hint, and no one in the rest of the canton is told it is a statutory day off.

## D7 Sundays are not listed

Easter Sunday, Whit Sunday and the Federal Day of Prayer fall on Sundays, which are rest days anyway. They are left out, like in the visibility dataset. A country where a Sunday holiday has a legal effect (a substitute day, a shop rule) can still list it.

## D8 Without a region, only nationwide days

`holidays(country, year)` and `isHoliday(date, country)` without a region return only entries that apply in every region. Asking whether a day is a holiday in Switzerland, without a canton, can only be answered yes for those. The year file always has everything.

## D9 Default type filter: public

`holidays()`, `isHoliday()`, `next()` and `previous()` return only `public` days unless `types` says otherwise. A calendar that shows customs as days off is wrong in a way users notice late (payroll, deadlines). Pass `['public', 'bank', 'observance']` (exported as `TYPES`) for everything.

## D10 Substitutes are extra entries

A substitute day is a second entry with the same `id` and `substituteFor` set to the original date. The original stays, because it is still the holiday (and may matter for shops or deadlines). Consumers that map ids see both.

## D11 Observance precedence by specificity, not file order

A listed region beats `all`; two matches on the same level fail the build. File order would make a silent mistake possible (a second observance for a region that is never reached).

## D12 Romansh names are not included yet

Romansh (`rm`) is a national language of Switzerland, but the ported dataset has no Romansh names and none were researched. CH lists `languages: [de, fr, it]`; adding `rm` later means adding a name to every CH holiday (the build enforces it).

## D13 Liechtenstein: ArG Art. 18 for public, LLV calendar for observances

The 13 days of the Labour Act are `public`. The national administration also closes on Candlemas, Saint Joseph, Berchtold’s Day, Shrove Tuesday, Good Friday, Christmas Eve and New Year’s Eve; these are `observance`. The LLV calendar is the employer calendar of the administration, not a law for all employers, so `bank` or `public` would claim too much. The LLV bridge days (Feiertagsbrücke) are not listed.

## D14 Liechtenstein regions

The 11 municipalities are the ISO 3166-2:LI subdivisions and are listed, so that region codes from other systems are accepted. No holiday differs between them, so every entry is nationwide.

## D15 Generated files are committed

`dist/`, `js/data/` and the fixture outputs are in git, so that jsDelivr can serve the year files straight from GitHub and the npm and Composer packages need no build step. CI fails when the committed output differs from a fresh build.

## D-bnl-1 Belgium: the ten days are public; communities mapped to regions

`public` in BE means one of the ten days of the Royal Decree of 18 April 1974 under the Holidays Act of 4 January 1974. The extra days of the federal administration (2 November, 15 November, 26 December; Royal Decree of 19 November 1998, Art. 14) and the community days (11 July, 27 September, 15 November) are `observance`: no law gives employees these days off. A replacement day for a holiday on a Sunday or a usual non-working day is set per company (Act Art. 6–9) and is not modelled.

The communities are not ISO 3166-2 subdivisions. Their days go to the regions where the community has competence: Flemish Community to BE-VLG and BE-BRU, French Community to BE-WAL and BE-BRU, German-speaking Community to BE-WAL with a note naming its nine municipalities (D6 applied to a part of a region). A pseudo-region per community would not be an ISO code and would break region lookups.

## D-bnl-2 Netherlands: no statutory day off; public by the Algemene termijnenwet

Dutch law gives employees no day off on a holiday; the cao decides. `public` in the European Netherlands means a day of the Algemene termijnenwet, Art. 3 para. 1, that is a general day off in practice. Good Friday (Art. 3 para. 2, time limits only) and Liberation Day (in Art. 3 para. 1, but a day off only under some cao’s, many only every fifth year) are `observance` (D4). A lustrum rule (`public` every fifth year) would rest on cao practice, not on a law.

## D-bnl-3 Netherlands: the Caribbean Netherlands are regions from 2010

Bonaire, Saba and Sint Eustatius are first-level subdivisions of ISO 3166-2:NL (NL-BQ1, NL-BQ2, NL-BQ3) and are listed. Their holidays follow the Arbeidswet 2000 BES, Art. 23, from 10 October 2010; there are no entries for them before. As a result, before 2010 no Dutch entry is nationwide, and a query without a region returns nothing for those years (D8). Aruba, Curaçao and Sint Maarten (NL-AW, NL-CW, NL-SX) are left out: they are countries of the Kingdom with their own law and their own ISO 3166-1 codes.

## D-bnl-4 Luxembourg: no regions

No Luxembourg holiday differs within the country, so `regions` is `[]` (CONTRIBUTING.md, step 4). The 12 cantons of ISO 3166-2:LU are not listed. This differs from Liechtenstein (D14); the owner decides whether LU should list its cantons the same way.
