# Changelog

## 1.1.0 - 2026-11-20

- Country names, local languages and region names come from craftsmith/regions (docs/decisions.md D16). The rule files keep only the region codes; the build reads craftsmith/regions as a dev dependency, so both packages still have no runtime dependencies. Every region code must exist there.
- Holiday names in the plugin languages: `translations/<lang>.yaml` for German, French, Italian, Spanish, Dutch, Polish, Portuguese, Russian, Turkish and Romansh, merged into `name` of every holiday (D17). These names are machine-written and listed for review in docs/coverage.md.
- New method `name(id, language)` in PHP and JS: the exact tag, then its base language, then English; `null` for an unknown id.
- Switzerland lists Romansh (`rm`) as a local language and has an `rm` name for every holiday (D12, machine-written).

### Changed output

- `name` in every year file, in `holidays()`, `next()` and `previous()` has the translated names after the existing ones. No existing name changed.
- `countries()`, `regions()` and `json/index.json`: names are those of craftsmith/regions, English first, with its translations. 22 region names lose their level word:
  - BE-BRU: nl “Brussels Hoofdstedelijk Gewest” → Brussel, fr “Région de Bruxelles-Capitale” → Bruxelles-Capitale, de “Region Brüssel-Hauptstadt” → Brüssel, en “Brussels-Capital Region” → Brussels
  - BE-VLG: nl “Vlaams Gewest” → Vlaanderen, fr “Région flamande” → Flandre, de “Flämische Region” → Flandern, en “Flemish Region” → Flanders
  - BE-WAL: nl “Waals Gewest” → Wallonië, fr “Région wallonne” → Wallonie, de “Wallonische Region” → Wallonien, en “Walloon Region” → Wallonia
  - ES-AS es “Principado de Asturias” → Asturias; ES-MC es “Región de Murcia” → Murcia; ES-MD es “Comunidad de Madrid” → Madrid; ES-NC es “Comunidad Foral de Navarra” → Navarra
  - IT-BZ it “Provincia autonoma di Bolzano – Alto Adige” → Bolzano, en “South Tyrol (Autonomous Province of Bolzano)” → South Tyrol; IT-TN it “Provincia autonoma di Trento” → Trento, en “Trentino (Autonomous Province of Trento)” → Trentino
  - PT-20 pt “Região Autónoma dos Açores” → Açores; PT-30 pt “Região Autónoma da Madeira” → Madeira
- `languages`: CH `[de, fr, it]` → `[de, fr, it, rm]`; LU `[lb, fr, de]` → `[fr, lb, de]` (the order of craftsmith/regions).
- Size: with the translations in every names map, the compiled rules grow from 430 KB to 597 KB (`js/data/`, the npm package; `src/data/` the same for Composer) and the year files in `json/` from 2.3 MB to 3.6 MB.

### Before release

- TODO: switch the devDependency `@craftsmith/regions` from `file:../regions` to the published npm version (D16). Until then `npm ci` and CI need regions next to this folder.

## 1.0.0 - 2026-11-15

First release.

- 18 countries with their regions: Switzerland, Liechtenstein, Germany, Austria, France, Monaco, Italy, San Marino, Vatican City, Spain, Andorra, Portugal, Malta, the United Kingdom, Ireland, Belgium, the Netherlands and Luxembourg.
- Every holiday cites its legal source. Each country has `countries/<cc>/sources.md` with the sources, the verification and the comparison with the OpenHolidays API and date-holidays.
- Types `public`, `bank` and `observance`, half days with a start time, substitute days, ISO 3166-2 regions.
- PHP package `craftsmith/holidays` and npm package `@craftsmith/holidays` with the same API and byte-identical results, checked for every country and year from 2000 to 2050.
- Precomputed JSON year files for 2025–2036 in `json/`, also served by jsDelivr.
