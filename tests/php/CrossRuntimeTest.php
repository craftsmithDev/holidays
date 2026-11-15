<?php

declare(strict_types=1);

namespace craftsmith\holidays\tests;

use craftsmith\holidays\Engine;
use craftsmith\holidays\Holidays;
use PHPUnit\Framework\TestCase;

/**
 * Cross-runtime test: the PHP runtime produces byte-identical JSON to the JS
 * runtime for every country and every year from 2000 to 2050. The JS side is
 * written to a temporary folder by scripts/dump.mjs (needs node); the
 * committed json/ files are checked as well.
 */
final class CrossRuntimeTest extends TestCase
{
    private const FROM = 2000;
    private const TO = 2050;

    public function testBundledCountries(): void
    {
        $holidays = new Holidays();
        $dir = $this->dumpJs(Support::root() . '/src/data');
        $count = $this->compare($holidays, $dir, self::FROM, self::TO);
        self::assertSame(count($holidays->countries()) * (self::TO - self::FROM + 1), $count);

        $index = Engine::encode(['format' => Engine::FORMAT, 'years' => ['from' => self::FROM, 'to' => self::TO], 'countries' => $holidays->countries()]);
        self::assertSame((string)file_get_contents("$dir/index.json"), $index);
    }

    public function testFixtures(): void
    {
        $rules = Support::root() . '/tests/fixtures/rules';
        self::assertGreaterThan(0, $this->compare(new Holidays($rules), $this->dumpJs($rules), self::FROM, self::TO));
    }

    public function testCommittedYearFiles(): void
    {
        $holidays = new Holidays();
        $years = Support::json('json/index.json')['years'];
        $index = Engine::encode(['format' => Engine::FORMAT, 'years' => $years, 'countries' => $holidays->countries()]);
        self::assertSame((string)file_get_contents(Support::root() . '/json/index.json'), $index);
        $count = $this->compare($holidays, Support::root() . '/json', $years['from'], $years['to']);
        self::assertSame(count($holidays->countries()) * ($years['to'] - $years['from'] + 1), $count);
    }

    public function testRulesFilesAreReencodedIdentically(): void
    {
        foreach (glob(Support::root() . '/src/data/*.json') ?: [] as $file) {
            $text = (string)file_get_contents($file);
            self::assertSame($text, Engine::encode(json_decode($text, true, 512, JSON_THROW_ON_ERROR)), basename($file));
        }
    }

    /**
     * Writes the JS results for FROM–TO into a temporary folder and returns it.
     */
    private function dumpJs(string $rulesDir): string
    {
        $dir = sys_get_temp_dir() . '/holidays-js-' . bin2hex(random_bytes(6));
        $command = sprintf('node %s %s %s %d %d 2>&1', escapeshellarg(Support::root() . '/scripts/dump.mjs'), escapeshellarg($dir), escapeshellarg($rulesDir), self::FROM, self::TO);
        exec($command, $output, $status);
        self::assertSame(0, $status, "node scripts/dump.mjs failed:\n" . implode("\n", $output));
        register_shutdown_function(static function() use ($dir): void {
            array_map('unlink', glob("$dir/*/*.json") ?: []);
            array_map('rmdir', glob("$dir/*", GLOB_ONLYDIR) ?: []);
            array_map('unlink', glob("$dir/*.json") ?: []);
            @rmdir($dir);
        });

        return $dir;
    }

    private function compare(Holidays $holidays, string $dir, int $from, int $to): int
    {
        $count = 0;
        foreach ($holidays->countries() as $country) {
            for ($year = $from; $year <= $to; $year++) {
                $file = sprintf('%s/%s/%d.json', $dir, strtolower($country['code']), $year);
                self::assertFileExists($file);
                self::assertSame((string)file_get_contents($file), Engine::encode($holidays->year($country['code'], $year)), "{$country['code']} $year");
                $count++;
            }
        }

        return $count;
    }
}
