<?php

// Writes the year files and the index with the PHP runtime, in the layout
// of json/. scripts/dump.mjs does the same with the JS runtime; the
// cross-runtime test (tests/php/CrossRuntimeTest.php) compares both.
//   php scripts/dump.php <out-dir> [rules-dir] [from] [to]

declare(strict_types=1);

use craftsmith\holidays\Engine;
use craftsmith\holidays\Holidays;

require dirname(__DIR__) . '/vendor/autoload.php';

$out = $argv[1] ?? null;
if ($out === null) {
    fwrite(STDERR, "usage: php scripts/dump.php <out-dir> [rules-dir] [from] [to]\n");
    exit(2);
}
$rulesDir = $argv[2] ?? dirname(__DIR__) . '/src/data';
$from = (int)($argv[3] ?? 2000);
$to = (int)($argv[4] ?? 2050);

$holidays = new Holidays($rulesDir);
$files = 0;
foreach ($holidays->countries() as $country) {
    $dir = $out . '/' . strtolower($country['code']);
    if (!is_dir($dir)) {
        mkdir($dir, 0777, true);
    }
    for ($year = $from; $year <= $to; $year++) {
        file_put_contents("$dir/$year.json", Engine::encode($holidays->year($country['code'], $year)));
        $files++;
    }
}
file_put_contents($out . '/index.json', Engine::encode([
    'format' => Engine::FORMAT,
    'years' => ['from' => $from, 'to' => $to],
    'countries' => $holidays->countries(),
]));
echo "Wrote $files year files to $out\n";
