# Decisions

Modelling questions without one obvious answer, how this library answers them, and why. The owner reviews these; change them here first, then in the code and data.

## D1 YAML as the source format, JSON for everything else

The rule files are YAML: contributors write and review them by hand, and YAML allows comments next to a legal nuance. The YAML traps (dates turned into timestamps, `NO` turned into `false`, `08` read as octal) are closed by parsing with the JSON schema of js-yaml, and the JSON Schema rejects anything else. The build converts YAML to JSON once (`src/data/<cc>.json`, and `js/data/<cc>.js` for JS), so neither runtime needs a YAML parser and the PHP package has no dependency at all.

## D2 The runtimes evaluate rules; the year files are a by-product

Both runtimes read the compiled rules and compute any year in the range 1583–9999 (the Gregorian calendar starts in 1583). The precomputed files (`json/`, 2025–2036: the previous year to ten years ahead) are for consumers without a runtime. Shipping only year files would cap the range and double the data in each package.

## D3 Integer day numbers, no Date objects

All arithmetic runs on integer day numbers (days since 1970-01-01, proleptic Gregorian). This removes time zones and daylight saving from the problem and makes PHP and JS produce the same result by construction. Inputs are `YYYY-MM-DD` strings; a PHP `DateTimeInterface` or a JS `Date` is read in its own (local) time zone.

## D4 Three types, partial days as a time

`type` is one of `public`, `bank`, `observance`; a partial day is the same type plus `startTime`. A day that is statutory only for some employees, or only in part of a region, is an `observance` at that level, with a note naming who or where (see D6). The alternative, a fourth type such as `partial-public`, would mix two questions (is it a day off, and for whom) in one field.

## D5 Switzerland: public means equal to Sunday under ArG Art. 20a

Swiss cantons decide their holidays; the Labour Act (Art. 20a) lets each canton equate at most eight of them with Sunday, plus 1 August. The SECO list of these days is the most uniform official source for all 26 cantons, so `public` in CH means: in the SECO list for that canton (or 1 August). Every other cantonal holiday is an `observance`, even when cantonal law calls it a rest day (e.g. Whit Monday in Glarus, see countries/ch/sources.md). The note on each observance says which.

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

`src/data/`, `js/data/`, `json/` and the compiled test fixtures are in git, so that jsDelivr can serve the year files straight from GitHub and the npm and Composer packages need no build step. Only the years 2025–2036 are committed as year files, to keep the repository small; the cross-runtime test still compares PHP and JS for 2000–2050, in a temporary folder. CI fails when the committed output differs from a fresh build.

## D-fr-1 France: only the subdivisions with their own holidays are regions

ISO 3166-2:FR has several levels: 12 metropolitan regions, Corsica, Paris and the Métropole de Lyon, the European collectivity of Alsace (FR-6AE, since 2021, with the departments FR-67 and FR-68 below it), 95 metropolitan departments and the overseas codes (FR-971 to FR-976 since 2020, FR-BL, FR-MF, FR-PM, FR-NC, FR-PF, FR-WF and others). The extra days follow departments and overseas territories: L3134-13 names the departments Moselle, Bas-Rhin and Haut-Rhin, and Moselle sits in the region Grand Est with seven departments that do not have the days. So the regions of FR are the departments FR-57, FR-67, FR-68 and the overseas codes FR-971, FR-972, FR-973, FR-974, FR-976, FR-BL and FR-MF, the ISO 3166-2 codes in force. FR-6AE is not listed (it would duplicate FR-67 and FR-68), nor the former alpha codes FR-GP, FR-MQ, FR-GF, FR-RE, FR-YT (removed from ISO 3166-2 in 2021).

Everywhere else in France the holidays are the nationwide ones. A query without a region returns exactly them (D8); a region code that is not listed (for example FR-75C) is rejected, as for every country. French Polynesia, New Caledonia and Wallis and Futuna have their own labour codes and are not covered; Saint-Pierre-et-Miquelon has no day of its own and needs no region.

## D-fr-2 France: public means “jour férié” by law, and Whit Monday stays public

Code du travail L3133-1 lists eleven fêtes légales as jours fériés, but only 1 May is a compulsory day off nationwide (L3133-4); collective agreements decide about the others (L3133-3-1). Taking “compulsory day off” as the line would leave France with one public holiday, which no French employer, calendar or authority would recognise. So `public` in FR means: designated jour férié by law (L3133-1, L3134-13 for Alsace-Moselle, L3422-2 overseas).

Whit Monday follows the same line. It is still in L3133-1. Since 2004 the unpaid journée de solidarité exists, and an employer or agreement may put it on Whit Monday (L3133-11; from 2005 to 2007 Whit Monday was the default). That changes whether people work, not whether the day is a jour férié, so the day is `public` with a note.

## D-fr-3 France: Good Friday in Alsace-Moselle is an observance

L3134-13 makes Good Friday a jour férié only “dans les communes ayant un temple protestant ou une église mixte”. The DREETS guide on local labour law repeats this limit. Following D4 and D6, a day that is statutory only in part of a region is an `observance` at that level, with a note naming where. 26 December is `public` in all three departments. OpenHolidays and date-holidays list Good Friday as a public holiday in the whole of the three departments; see countries/fr/sources.md.

## D-mc-1 Monaco: the Sunday rule adds a day

Loi n° 798 art. 1er: when New Year’s Day, 1 May, Assumption, All Saints, the Prince’s Day or Christmas falls on a Sunday, “le lundi qui suit sera jour férié légal”. The Sunday stays a jour férié of the same article, so the Monday is a `substitute` (D10), not a move. The yearly government circular writes “reporté au lundi”; the data keeps both days because the law lists both.

## D-mc-2 Monaco: Immaculate Conception on a Sunday moves to Monday

The law has no Sunday rule for 8 December. The government page on public holidays (“8th December or 9th if 8th is on Sunday”) and the circular for 2024 (n° 2023-14) move the day; the FEDEM legal note of October 2024 reports the same for 2019 (circular n° 2019-1, not read here) to Monday 9 December, following the liturgical calendar. This is a move (`adjust` with `moveTo`), since the circulars replace the Sunday. Applied to every year 2000–2050; the circulars before 2019 were not checked (open point in countries/mc/sources.md).

## D-it-1 Italy: Bolzano and Trento instead of Trentino-Alto Adige

ISO 3166-2:IT has 20 regions (IT-21 … IT-88) and below them the provinces, among them the autonomous provinces Bolzano (IT-BZ) and Trento (IT-TN), which together form Trentino-Alto Adige (IT-32). Only South Tyrol has a holiday of its own (Whit Monday, D-it-2). The region list is the 19 other regions plus IT-BZ and IT-TN: 21 codes that cover Italy once, so that a South Tyrol query gets Whit Monday and a Trentino query does not. IT-32 is not a region code in this library; a caller with IT-32 has to choose IT-BZ or IT-TN. The alternative, IT-32 with Whit Monday as an observance and a note (as in D6), would tell everyone in Trentino about a day off they do not have.

## D-it-2 Italy: Whit Monday in South Tyrol is an observance

The national collective agreements give a paid holiday on the local patron saint’s day. In South Tyrol, territorial agreements put that holiday on Whit Monday for the whole province (e.g. the 2016 agreement for commerce, Art. 8; the contract for the executives of the Region and the chambers of commerce, Art. 22). No state law makes Whit Monday a giorno festivo, so under the Italian type rule (public = Legge 260/1949) it is an `observance`, with the agreements as sources. In practice it is a general day off in the province. Patron-saint days elsewhere are municipal and not listed.

## D-sm-1 San Marino regions

The 9 castelli are the ISO 3166-2:SM subdivisions and are listed, as for Liechtenstein (D14). No holiday differs between them.

## D-va-1 Vatican City: public means a day off under the personnel regulations

The State has no labour act with a list of holidays. The Holy See and the Governatorato, which employ nearly everyone who works in the State, have personnel regulations with the same list: Sundays, the holy days of obligation of canon 1246 §1, and ten further days (anniversary of the pope’s election, his name day, the anniversary of the State, Saint Joseph the Worker, the last three days of Holy Week, Easter Monday and Tuesday, the eve and the day after the Assumption, All Souls, Christmas Eve and the two days after Christmas, New Year’s Eve). These are `public`. The canon 1246 days keep their universal dates (Ascension and Corpus Christi on Thursday), because the regulations name the feasts of obligation and no Vatican source moves them to Sunday.

## D-va-2 Vatican City: no Latin names

Latin is the official language of the Holy See, but the laws of the State and the personnel regulations are in Italian. Latin names exist for the liturgical feasts, not for days such as “the day after the Assumption” or “the last day of the year”, and the build requires a name for every holiday in every language of the country. VA lists `languages: [it]`; adding `la` later means a Latin name for every VA holiday from a citable source.

## D-es-1 Spain: Spanish as the only language, regional names where an official text gives them

`languages: [es]`: Spanish is the language of the BOE resolutions and the only official language in all 19 communities and cities. Catalan, Basque and Galician are official only in some of them, so they are not required for every holiday. Where a regional calendar decree names a day in its own language, the name is added (`gl` from the DOG decrees for 2026 and 2027, `eu` from the Basque versions of the BOPV decrees for 2026 and 2027, `ca` from the Catalan order for 2026, which names only Sant Esteve and the Festa d’Aran). Names were not translated by hand.

## D-es-2 Spain: recuperable days stay public

The BOE marks some days “recuperable”: a paid day off whose working hours are made up later (Estatuto de los Trabajadores Art. 37.2 allows a fourteenth, recuperable day; some communities also declare one of their days recuperable). It is still a day off by law, so the type is `public` and the observance has a note. Where a community lets the employer choose which of several days is recuperable (Catalonia in most years), each of those days has the note.

## D-es-3 Spain: Arán and the Canary Islands

The BOE notes name days that hold only in part of a community: one day per island in the Canary Islands and the Fiesta de Arán (17 June) in the territory of Arán, Catalonia. Following D6 they are `observance` at community level, with a note naming the island or Arán. The Catalan day that Arán replaces (usually 26 December) stays `public` for Catalonia with a note, although it is not a holiday in Arán. D6 would make it an `observance` for the whole of Catalonia; that would tell more than 99% of Catalan employees that Saint Stephen is not a statutory day off. Open for the owner: keep this exception or apply D6 strictly.

## D-es-4 Spain: years without a BOE resolution

The days are set by a resolution each year; there is one for 2000–2027. Before 2000 the library returns nothing. From 2028 it returns only the nine national holidays the communities cannot replace (RD 2001/1983 Art. 45.1 a–c) in every community, without the ones on a Sunday, because the yearly resolution decides where a Sunday holiday moves. When a new resolution is published, its table is added and the start year of this fallback moves on by one year.

## D-ad-1 Andorra: yearly decree, parishes as regions, coverage

Llei 31/2018 Art. 62 leaves the holidays to a yearly Govern decree on the labour calendar. All 14 days of the decree are `public`. The decree lets sectors directly related to tourism move ten of them by agreement; those observances have a note, the type stays `public`. The 7 parishes are listed as regions, as for Liechtenstein (D14); parish holidays (up to four per parish, set by each comú) are municipal and not listed. Only the years whose decree or its official publication was read are covered (2024–2027); other years return nothing. Carnival is a date list because the decree sets it each year (Tuesday 20 February in 2024, the Monday before Ash Wednesday in 2025–2027).

## D-pt-1 Portugal: districts listed as regions, municipal holidays left out

ISO 3166-2:PT has 18 districts and the two autonomous regions. Only the Azores (PT-20) and Madeira (PT-30) have holidays of their own; the districts are listed anyway, like the municipalities of Liechtenstein (D14), so that a district code is accepted and returns the national days. Municipal holidays (one per municipality, Labour Code Art. 235) are not modelled; the scope is country and region.

## D-pt-2 Malta: no substitute days

Cap. 252 Art. 6 never moves a holiday that falls on a weekend. Under Act II of 2005 such a holiday gave nothing extra; since 1 January 2021 it gives one extra day of vacation leave, to be taken when agreed. That is a leave entitlement without a date, so the Malta data has no `substitute`. A consumer who counts leave days can find the weekend holidays from the year files.

## D-gb-1 United Kingdom: bank holidays are public

The UK has no statutory list of days off; the bank holidays are its public holidays. `public` in GB means a bank holiday in that part of the UK (Banking and Financial Dealings Act 1971 Sch. 1, a Royal Proclamation under its s. 1, or the St Andrew’s Day Bank Holiday (Scotland) Act 2007), plus Christmas Day and Good Friday in England, Wales and Northern Ireland, which are customary holidays there and on the gov.uk list. There is no general statutory right to the day off (gov.uk: “Your employer does not have to give you paid leave on bank or public holidays”); `rules.yaml` says so. Typing them `bank` would hide every UK holiday from the default filter (D9), although they are the days the country takes off.

## D-gb-2 Welsh and Gaelic names are optional in GB

`languages` lists only `en`. Welsh (`cy`) names are added where gov.uk/gwyliau-banc gives one, which is every day except the Golden Jubilee 2002 and the Royal Wedding 2011. No official Scottish Gaelic (`gd`) name was found, so there are none. Listing `cy` or `gd` in `languages` would make the build demand a name for every day, including days without an official translation. The format allows names in further languages; consumers fall back to `en`.

## D-gb-3 UK substitute days keep the weekend date

Under the 1971 Act the weekday is the bank holiday and the weekend date is not. The data still lists the weekend date and adds the weekday as a substitute (D10), because Christmas Day stays Christmas Day and the format models UK chaining this way. A day the law moves without a weekend (the spring bank holiday 2002, 2012 and 2022, the early May bank holiday 2020) is a changed date rule for that year, not a substitute.

## D-ie-1 Ireland: no substitute days

The Organisation of Working Time Act 1997 has no weekend rule. A public holiday on a Saturday or Sunday still gives the s. 21 entitlement (a paid day off within a month, an extra day of annual leave or an extra day’s pay), but “there is no legal entitlement to have the next working day off work” (Workplace Relations Commission). So IE has no `substitute`; the entitlement is described in `rules.yaml`. If banks close on the following Monday, that is a `bank` day for later, once an official source exists.

## D-bnl-1 Belgium: the ten days are public; communities mapped to regions

`public` in BE means one of the ten days of the Royal Decree of 18 April 1974 under the Holidays Act of 4 January 1974. The extra days of the federal administration (2 November, 15 November, 26 December; Royal Decree of 19 November 1998, Art. 14) and the community days (11 July, 27 September, 15 November) are `observance`: no law gives employees these days off. A replacement day for a holiday on a Sunday or a usual non-working day is set per company (Act Art. 6–9) and is not modelled.

The communities are not ISO 3166-2 subdivisions. Their days go to the regions where the community has competence: Flemish Community to BE-VLG and BE-BRU, French Community to BE-WAL and BE-BRU, German-speaking Community to BE-WAL with a note naming its nine municipalities (D6 applied to a part of a region). A pseudo-region per community would not be an ISO code and would break region lookups.

## D-bnl-2 Netherlands: no statutory day off; public by the Algemene termijnenwet

Dutch law gives employees no day off on a holiday; the cao decides. `public` in the European Netherlands means a day of the Algemene termijnenwet, Art. 3 para. 1, that is a general day off in practice. Good Friday (Art. 3 para. 2, time limits only) and Liberation Day (in Art. 3 para. 1, but a day off only under some cao’s, many only every fifth year) are `observance` (D4). A lustrum rule (`public` every fifth year) would rest on cao practice, not on a law.

## D-bnl-3 Netherlands: the Caribbean Netherlands are regions from 2010

Bonaire, Saba and Sint Eustatius are first-level subdivisions of ISO 3166-2:NL (NL-BQ1, NL-BQ2, NL-BQ3) and are listed. Their holidays follow the Arbeidswet 2000 BES, Art. 23, from 10 October 2010; there are no entries for them before. As a result, before 2010 no Dutch entry is nationwide, and a query without a region returns nothing for those years (D8). Aruba, Curaçao and Sint Maarten (NL-AW, NL-CW, NL-SX) are left out: they are countries of the Kingdom with their own law and their own ISO 3166-1 codes.

## D-bnl-4 Luxembourg: no regions

No Luxembourg holiday differs within the country, so `regions` is `[]` (CONTRIBUTING.md, step 4). The 12 cantons of ISO 3166-2:LU are not listed. This differs from Liechtenstein (D14); the owner decides whether LU should list its cantons the same way.
