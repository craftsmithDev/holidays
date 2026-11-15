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

## D-fr-1 France: only the subdivisions with their own holidays are regions

ISO 3166-2:FR has several levels: 12 metropolitan regions, Corsica, Paris and the Métropole de Lyon, the European collectivity of Alsace (FR-6AE, since 2021, with the departments FR-67 and FR-68 below it), 95 metropolitan departments and the overseas codes (FR-971 to FR-976 since 2020, FR-BL, FR-MF, FR-PM, FR-NC, FR-PF, FR-WF and others). The extra days follow departments and overseas territories: L3134-13 names the departments Moselle, Bas-Rhin and Haut-Rhin, and Moselle sits in the region Grand Est with seven departments that do not have the days. So the regions of FR are the departments FR-57, FR-67, FR-68 and the overseas codes FR-971, FR-972, FR-973, FR-974, FR-976, FR-BL and FR-MF, the ISO 3166-2 codes in force. FR-6AE is not listed (it would duplicate FR-67 and FR-68), nor the former alpha codes FR-GP, FR-MQ, FR-GF, FR-RE, FR-YT (removed from ISO 3166-2 in 2021).

Everywhere else in France the holidays are the nationwide ones. A query without a region returns exactly them (D8); a region code that is not listed (for example FR-75C) is rejected, as for every country. French Polynesia, New Caledonia and Wallis and Futuna have their own labour codes and are not covered; Saint-Pierre-et-Miquelon has no day of its own and needs no region.

## D-fr-2 France: public means “jour férié” by law, and Whit Monday stays public

Code du travail L3133-1 lists eleven fêtes légales as jours fériés, but only 1 May is a compulsory day off nationwide (L3133-4); collective agreements decide about the others (L3133-3-1). Taking “compulsory day off” as the line would leave France with one public holiday, which no French employer, calendar or authority would recognise. So `public` in FR means: designated jour férié by law (L3133-1, L3134-13 for Alsace-Moselle, L3422-2 overseas).

Whit Monday follows the same line. It is still in L3133-1. Since 2004 the unpaid journée de solidarité exists, and an employer or agreement may put it on Whit Monday (L3133-11; from 2005 to 2007 Whit Monday was the default). That changes whether people work, not whether the day is a jour férié, so the day is `public` with a note.

## D-fr-3 France: Good Friday in Alsace-Moselle is an observance

L3134-13 makes Good Friday a jour férié only “dans les communes ayant un temple protestant ou une église mixte”. The DREETS guide on local labour law repeats this limit. Following D4 and D6, a day that is statutory only in part of a region is an `observance` at that level, with a note naming where. 26 December is `public` in all three departments. OpenHolidays and date-holidays list Good Friday as a public holiday in the whole of the three departments; see verification/fr.md.

