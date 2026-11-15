<?php

// Regenerates tests/golden/ch-2026-2030.json from the Swiss holiday data of
// the craftsmith visibility plugin, the reference dataset this library was
// ported from. Reads the plugin read-only; it is not a dependency.
//   php scripts/golden-visibility.php /path/to/craft_plugins/visibility > tests/golden/ch-2026-2030.json

declare(strict_types=1);

$plugin = rtrim($argv[1] ?? '', '/');
if ($plugin === '' || !is_file("$plugin/src/helpers/HolidayRules.php")) {
    fwrite(STDERR, "usage: php scripts/golden-visibility.php <visibility-plugin-dir>\n");
    exit(2);
}
require "$plugin/src/helpers/HolidayRules.php";
$data = require "$plugin/src/support/holidays/ch.php";

$cantons = ['AG', 'AI', 'AR', 'BE', 'BL', 'BS', 'FR', 'GE', 'GL', 'GR', 'JU', 'LU', 'NE', 'NW', 'OW', 'SG', 'SH', 'SO', 'SZ', 'TG', 'TI', 'UR', 'VD', 'VS', 'ZG', 'ZH'];
$out = [];
foreach ($cantons as $canton) {
    foreach (range(2026, 2030) as $year) {
        $out["CH-$canton"][(string)$year] = array_keys(\craftsmith\visibility\helpers\HolidayRules::forYear($data, $year, $canton));
    }
}
echo json_encode(
    ['source' => 'craftsmith visibility plugin, src/support/holidays/ch.php (HolidayRules::forYear, all cantons, 2026–2030)', 'dates' => $out],
    JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE,
) . "\n";
