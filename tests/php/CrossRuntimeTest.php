<?php

declare(strict_types=1);

namespace craftsmith\holidays\tests;

use craftsmith\holidays\Engine;
use craftsmith\holidays\Holidays;
use PHPUnit\Framework\TestCase;

/**
 * Cross-runtime test: the PHP runtime produces byte-identical JSON to the
 * files the JS runtime wrote (dist/json and tests/fixtures/json), for every
 * country and every year from 2000 to 2050.
 */
final class CrossRuntimeTest extends TestCase
{
    private const FROM = 2000;
    private const TO = 2050;

    public function testBundledCountries(): void
    {
        $holidays = new Holidays();
        $count = $this->compare($holidays, 'dist/json');
        self::assertSame(count($holidays->countries()) * (self::TO - self::FROM + 1), $count);

        $index = Engine::encode(['format' => Engine::FORMAT, 'years' => ['from' => self::FROM, 'to' => self::TO], 'countries' => $holidays->countries()]);
        self::assertSame((string)file_get_contents(Support::root() . '/dist/json/index.json'), $index);
    }

    public function testFixtures(): void
    {
        $holidays = new Holidays(Support::root() . '/tests/fixtures/rules');
        self::assertGreaterThan(0, $this->compare($holidays, 'tests/fixtures/json'));
    }

    public function testRulesFilesAreReencodedIdentically(): void
    {
        foreach (glob(Support::root() . '/dist/rules/*.json') ?: [] as $file) {
            $text = (string)file_get_contents($file);
            self::assertSame($text, Engine::encode(json_decode($text, true, 512, JSON_THROW_ON_ERROR)), basename($file));
        }
    }

    private function compare(Holidays $holidays, string $dir): int
    {
        $count = 0;
        foreach ($holidays->countries() as $country) {
            for ($year = self::FROM; $year <= self::TO; $year++) {
                $file = sprintf('%s/%s/%s/%d.json', Support::root(), $dir, strtolower($country['code']), $year);
                self::assertFileExists($file);
                self::assertSame((string)file_get_contents($file), Engine::encode($holidays->year($country['code'], $year)), "{$country['code']} $year");
                $count++;
            }
        }

        return $count;
    }
}
