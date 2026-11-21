# Coverage of holiday names

Every holiday has a name in each of the eleven plugin languages: en, de, fr, it, es, nl, pl, pt, ru, tr, rm (a test checks it). This page says where each name comes from and which names a person still has to check. State of 20 November 2026, 18 countries, 346 holidays.

## Where the names come from

- **Rule files** (`countries/<cc>/rules.yaml`): English and the local languages of the country, taken from the law or the official source the holiday cites. Exception: the 25 Romansh names of Switzerland (below).
- **Translation files** (`translations/<lang>.yaml`): the other plugin languages. All of them were written by Claude (Anthropic) on 20 November 2026 and are machine-written: no name was copied from an official source, and no person has checked them yet. Where a feast has an established name in the language (Christmas, Ascension, Corpus Christi, All Saints), that name was used; otherwise the local name was translated faithfully. Proper names were kept (Sette Giugno, Orangemen’s Day). No holiday was added.

| Language | Names | From rule files (sourced) | Machine-written in rule files | Machine-written in translations/ |
|---|---|---|---|---|
| en | 346 | 346 | 0 | 0 |
| de | 346 | 118 | 0 | 228 |
| fr | 346 | 80 | 0 | 266 |
| it | 346 | 82 | 0 | 264 |
| es | 346 | 53 | 0 | 293 |
| nl | 346 | 32 | 0 | 314 |
| pl | 346 | 0 | 0 | 346 |
| pt | 346 | 17 | 0 | 329 |
| ru | 346 | 0 | 0 | 346 |
| tr | 346 | 0 | 0 | 346 |
| rm | 346 | 0 | 25 | 321 |
| **Total** | 3806 | 728 | 25 | 3053 |

Further names in the rule files that are not plugin languages stay as they were in 1.0.0 (ca, eu, gl in ES, cy in GB, ga in IE, lb in LU, mt in MT, ca in AD) and are sourced.

When a person checks a name, the change goes into the YAML file, and this page drops the name from the machine-written count (for a whole file: say so in its header comment).

## Romansh names of Switzerland (machine-written, in rules.yaml)

CH lists Romansh as a local language (docs/decisions.md D12), so these names are in `countries/ch/rules.yaml`. They are in Rumantsch Grischun and need a check against a Romansh source (for example the Romansh pages of the Federal Chancellery or the Lia Rumantscha). The Genevan Fast keeps its French name. Least certain: `ch.federal-fast-monday` (“Rogaziun federala” for the Federal Day of Prayer) and the rm name of Candlemas in translations/rm.yaml (“Purificaziun da Maria”).

| Holiday | rm |
|---|---|
| `ch.new-year` | Bumaun |
| `ch.berchtold` | Di da Berchtold |
| `ch.epiphany` | Babania |
| `ch.republic-day` | Instauraziun da la Republica |
| `ch.saint-joseph` | Son Josef |
| `ch.good-friday` | Venderdi sontg |
| `ch.easter-monday` | Glindesdi da Pasca |
| `ch.naefelser-fahrt` | Pelegrinadi da Näfels |
| `ch.labour-day` | Di da la lavur |
| `ch.ascension` | Ascensiun |
| `ch.whit-monday` | Glindesdi da Tschuncaisma |
| `ch.corpus-christi` | Sontgilcrest |
| `ch.jura-independence` | Festa da l’independenza giurassiana |
| `ch.peter-and-paul` | Son Pieder e Son Paul |
| `ch.national-day` | Festa naziunala |
| `ch.assumption` | Assumziun da Maria |
| `ch.jeune-genevois` | Jeûne genevois |
| `ch.federal-fast-monday` | Glindesdi da la Rogaziun federala |
| `ch.saint-maurice` | San Murezzan |
| `ch.bruder-klaus` | Son Niclau da Flüe |
| `ch.all-saints` | Numnasontga |
| `ch.immaculate-conception` | Immaculata Concepziun |
| `ch.christmas` | Nadal |
| `ch.saint-stephen` | Son Steffan |
| `ch.restoration` | Restauraziun da la Republica |

## Review first

Names of days that exist in one country only are translations without an established model and carry the most risk. In every translation file, check these first:

| Country | Holidays |
|---|---|
| AD | `ad.meritxell` |
| AT | `at.saint-florian`, `at.saint-rupert`, `at.plebiscite-day`, `at.saint-martin`, `at.saint-leopold` |
| BE | `be.flemish-community-day`, `be.national-day`, `be.french-community-day`, `be.kings-feast`, `be.german-speaking-community-day` |
| CH | `ch.naefelser-fahrt`, `ch.jura-independence`, `ch.national-day`, `ch.jeune-genevois`, `ch.federal-fast-monday`, `ch.saint-maurice`, `ch.bruder-klaus`, `ch.restoration` |
| DE | `de.womens-day`, `de.uprising-anniversary`, `de.augsburg-peace-festival`, `de.world-childrens-day`, `de.national-day`, `de.reformation-day`, `de.repentance-day` |
| ES | `es.ceuta-convivencia-day`, `es.andalusia-day`, `es.balearic-islands-day`, `es.melilla-statute-day`, `es.fallas-monday`, `es.aragon-day`, `es.castile-leon-day`, `es.madrid-day`, `es.eid-al-fitr`, `es.galician-literature-day`, `es.canary-islands-day`, `es.castile-la-mancha-day`, `es.murcia-day`, `es.la-rioja-day`, `es.aran-day`, `es.saint-john`, `es.saint-james`, `es.cantabria-institutions-day`, `es.our-lady-of-africa`, `es.ceuta-day`, `es.circumnavigation-500`, `es.asturias-day`, `es.extremadura-day`, `es.catalonia-national-day`, `es.bien-aparecida`, `es.basque-government-anniversary`, `es.valencian-community-day`, `es.national-day`, `es.basque-country-day`, `es.eid-al-adha`, and the seven island holidays `es.island-*` |
| FR | `fr.abolition-of-slavery`, `fr.victory-day`, `fr.armistice-day` |
| GB | `gb.second-january`, `gb.royal-wedding`, `gb.early-may`, `gb.coronation`, `gb.spring-bank`, `gb.golden-jubilee`, `gb.diamond-jubilee`, `gb.platinum-jubilee`, `gb.world-cup`, `gb.battle-of-the-boyne`, `gb.summer-bank`, `gb.state-funeral`, `gb.saint-andrew` |
| IE | `ie.saint-brigid`, `ie.covid-commemoration`, `ie.may-bank-holiday`, `ie.june-bank-holiday`, `ie.august-bank-holiday`, `ie.national-day-of-mourning`, `ie.october-bank-holiday` |
| IT | `it.unification-150`, `it.saint-francis` |
| LI | `li.candlemas`, `li.national-day`, `li.nativity-of-mary` |
| LU | `lu.europe-day` |
| MC | `mc.saint-devote`, `mc.national-day` |
| MT | `mt.saint-pauls-shipwreck`, `mt.sette-giugno`, `mt.victory-day`, `mt.independence-day` |
| NL | `nl.queens-day`, `nl.kings-day`, `nl.dia-di-rincon`, `nl.emancipation-day`, `nl.flag-day-bonaire`, `nl.statia-day`, `nl.saba-day` |
| PT | `pt.madeira-autonomy-day`, `pt.azores-day`, `pt.national-day`, `pt.madeira-day`, `pt.restoration-of-independence`, `pt.saint-stephen` |
| SM | `sm.saint-agatha`, `sm.arengo`, `sm.fall-of-fascism`, `sm.national-day` |
| VA | `va.state-anniversary`, `va.holy-saturday`, `va.easter-tuesday`, `va.saint-joseph-the-worker`, `va.papal-election-anniversary`, `va.assumption-eve`, `va.day-after-assumption`, `va.papal-name-day`, `va.saint-john` |

Romansh, Turkish and Russian have the fewest established names for Western European holidays; their files need the closest look.
