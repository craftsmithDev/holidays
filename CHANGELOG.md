# Changelog

## 1.0.0 - 2026-11-15

First release.

- 18 countries with their regions: Switzerland, Liechtenstein, Germany, Austria, France, Monaco, Italy, San Marino, Vatican City, Spain, Andorra, Portugal, Malta, the United Kingdom, Ireland, Belgium, the Netherlands and Luxembourg.
- Every holiday cites its legal source. Each country has `countries/<cc>/sources.md` with the sources, the verification and the comparison with the OpenHolidays API and date-holidays.
- Types `public`, `bank` and `observance`, half days with a start time, substitute days, ISO 3166-2 regions.
- PHP package `craftsmith/holidays` and npm package `@craftsmith/holidays` with the same API and byte-identical results, checked for every country and year from 2000 to 2050.
- Precomputed JSON year files for 2025–2036 in `json/`, also served by jsDelivr.
