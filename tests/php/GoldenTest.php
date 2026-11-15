<?php

declare(strict_types=1);

namespace craftsmith\holidays\tests;

use craftsmith\holidays\Engine;
use craftsmith\holidays\Holidays;
use PHPUnit\Framework\TestCase;

/**
 * Golden test: CH 2026–2030 equals the visibility reference dataset, apart
 * from the documented deviations (docs/verification/ch.md).
 */
final class GoldenTest extends TestCase
{
    public function testSwitzerland2026To2030(): void
    {
        $golden = Support::json('tests/golden/ch-2026-2030.json')['dates'];
        $deviations = Support::json('tests/golden/ch-deviations.json')['deviations'];
        $holidays = new Holidays();
        self::assertCount(26, $golden);

        foreach ($golden as $region => $years) {
            foreach ($years as $year => $dates) {
                $expected = array_fill_keys($dates, true);
                foreach ($deviations as $d) {
                    if ($d['region'] === $region && str_starts_with($d['date'], (string)$year)) {
                        if ($d['change'] === 'added') {
                            $expected[$d['date']] = true;
                        } else {
                            unset($expected[$d['date']]);
                        }
                    }
                }
                $expected = array_keys($expected);
                sort($expected);
                $ours = array_values(array_unique(array_column($holidays->holidays('CH', (int)$year, $region, Engine::TYPES), 'date')));
                sort($ours);
                self::assertSame($expected, $ours, "$region $year");
            }
        }
    }
}
