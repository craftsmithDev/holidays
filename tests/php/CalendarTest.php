<?php

declare(strict_types=1);

namespace craftsmith\holidays\tests;

use craftsmith\holidays\Calendar;
use craftsmith\holidays\Holidays;
use DateTimeImmutable;
use DateTimeZone;
use PHPUnit\Framework\TestCase;

final class CalendarTest extends TestCase
{
    public function testDayNumbersRoundTrip(): void
    {
        for ($n = Calendar::dayNumber(1583, 1, 1); $n <= Calendar::dayNumber(9999, 12, 31); $n += 97) {
            [$y, $m, $d] = Calendar::civil($n);
            self::assertSame($n, Calendar::dayNumber($y, $m, $d));
        }
        self::assertSame(0, Calendar::dayNumber(1970, 1, 1));
    }

    public function testDayNumbersMatchPhpDates(): void
    {
        $utc = new DateTimeZone('UTC');
        foreach (['1583-01-01', '1900-02-28', '2000-02-29', '2026-11-15', '9999-12-31'] as $text) {
            $n = Calendar::parse($text);
            self::assertSame((int)(new DateTimeImmutable($text, $utc))->format('U') / 86400, $n);
            self::assertSame((int)(new DateTimeImmutable($text, $utc))->format('N'), Calendar::isoWeekday((int)$n));
            self::assertSame($text, Calendar::format((int)$n));
        }
        self::assertNull(Calendar::parse('2026-02-29'));
        self::assertNull(Calendar::parse("2026-01-01\n"));
    }

    public function testEaster(): void
    {
        $western = [2026 => '2026-04-05', 2027 => '2027-03-28', 2028 => '2028-04-16', 2029 => '2029-04-01', 2030 => '2030-04-21', 2285 => '2285-03-22'];
        foreach ($western as $year => $date) {
            self::assertSame($date, Calendar::format(Calendar::westernEaster($year)));
        }
        $orthodox = [2024 => '2024-05-05', 2025 => '2025-04-20', 2026 => '2026-04-12', 2027 => '2027-05-02'];
        foreach ($orthodox as $year => $date) {
            self::assertSame($date, Calendar::format(Calendar::orthodoxEaster($year)));
        }
        // PHP's own Easter function as a second opinion (Western, 1970–2037).
        if (!function_exists('easter_days')) {
            return;
        }
        for ($year = 1970; $year <= 2037; $year++) {
            $expected = (new DateTimeImmutable("$year-03-21", new DateTimeZone('UTC')))->modify('+' . easter_days($year) . ' days')->format('Y-m-d');
            self::assertSame($expected, Calendar::format(Calendar::westernEaster($year)), (string)$year);
        }
    }

    public function testDateTimeInput(): void
    {
        $holidays = new Holidays();
        self::assertTrue($holidays->isHoliday(new DateTimeImmutable('2026-08-01 23:30', new DateTimeZone('Europe/Zurich')), 'CH'));
    }
}
