<?php

declare(strict_types=1);

namespace craftsmith\holidays;

/**
 * Calendar arithmetic on plain dates. A date is an integer day number (days
 * since 1970-01-01, proleptic Gregorian). No time zones, no DateTime.
 * Mirrors js/calendar.js line by line.
 */
final class Calendar
{
    public const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

    private static function floorDiv(int $a, int $b): int
    {
        return intdiv($a, $b) - (($a % $b !== 0 && (($a < 0) !== ($b < 0))) ? 1 : 0);
    }

    /** Day number of a Gregorian date. */
    public static function dayNumber(int $year, int $month, int $day): int
    {
        $y = $month <= 2 ? $year - 1 : $year;
        $era = self::floorDiv($y, 400);
        $yoe = $y - $era * 400;
        $mp = $month > 2 ? $month - 3 : $month + 9;
        $doy = self::floorDiv(153 * $mp + 2, 5) + $day - 1;
        $doe = $yoe * 365 + self::floorDiv($yoe, 4) - self::floorDiv($yoe, 100) + $doy;

        return $era * 146097 + $doe - 719468;
    }

    /**
     * @return array{int, int, int} year, month, day
     */
    public static function civil(int $n): array
    {
        $z = $n + 719468;
        $era = self::floorDiv($z, 146097);
        $doe = $z - $era * 146097;
        $yoe = self::floorDiv($doe - self::floorDiv($doe, 1460) + self::floorDiv($doe, 36524) - self::floorDiv($doe, 146096), 365);
        $doy = $doe - (365 * $yoe + self::floorDiv($yoe, 4) - self::floorDiv($yoe, 100));
        $mp = self::floorDiv(5 * $doy + 2, 153);
        $day = $doy - self::floorDiv(153 * $mp + 2, 5) + 1;
        $month = $mp < 10 ? $mp + 3 : $mp - 9;

        return [$yoe + $era * 400 + ($month <= 2 ? 1 : 0), $month, $day];
    }

    /** ISO weekday: 1 = Monday … 7 = Sunday. */
    public static function isoWeekday(int $n): int
    {
        return (($n + 3) % 7 + 7) % 7 + 1;
    }

    /** Weekday key ('mon' … 'sun') → ISO weekday. */
    public static function weekdayNumber(string $key): int
    {
        $index = array_search($key, self::WEEKDAYS, true);

        return $index === false ? 0 : $index + 1;
    }

    public static function isValidDate(int $year, int $month, int $day): bool
    {
        if ($month < 1 || $month > 12 || $day < 1) {
            return false;
        }

        return self::civil(self::dayNumber($year, $month, $day)) === [$year, $month, $day];
    }

    /** Day number → 'YYYY-MM-DD'. */
    public static function format(int $n): string
    {
        [$y, $m, $d] = self::civil($n);

        return sprintf('%04d-%02d-%02d', $y, $m, $d);
    }

    /** 'YYYY-MM-DD' → day number, or null when not a valid date. */
    public static function parse(string $text): ?int
    {
        if (preg_match('/^(\d{4})-(\d{2})-(\d{2})$/D', $text, $m) !== 1) {
            return null;
        }
        [$y, $mo, $d] = [(int)$m[1], (int)$m[2], (int)$m[3]];

        return self::isValidDate($y, $mo, $d) ? self::dayNumber($y, $mo, $d) : null;
    }

    public static function yearOf(int $n): int
    {
        return self::civil($n)[0];
    }

    /** Western (Gregorian) Easter Sunday; anonymous Gregorian algorithm. */
    public static function westernEaster(int $year): int
    {
        $a = $year % 19;
        $b = self::floorDiv($year, 100);
        $c = $year % 100;
        $d = self::floorDiv($b, 4);
        $e = $b % 4;
        $f = self::floorDiv($b + 8, 25);
        $g = self::floorDiv($b - $f + 1, 3);
        $h = (19 * $a + $b - $d - $g + 15) % 30;
        $i = self::floorDiv($c, 4);
        $k = $c % 4;
        $l = (32 + 2 * $e + 2 * $i - $h - $k) % 7;
        $m = self::floorDiv($a + 11 * $h + 22 * $l, 451);
        $month = self::floorDiv($h + $l - 7 * $m + 114, 31);
        $day = (($h + $l - 7 * $m + 114) % 31) + 1;

        return self::dayNumber($year, $month, $day);
    }

    /** Orthodox Easter Sunday (Julian computus), as a Gregorian day number. */
    public static function orthodoxEaster(int $year): int
    {
        $a = $year % 4;
        $b = $year % 7;
        $c = $year % 19;
        $d = (19 * $c + 15) % 30;
        $e = (2 * $a + 4 * $b - $d + 34) % 7;
        $month = self::floorDiv($d + $e + 114, 31);
        $day = (($d + $e + 114) % 31) + 1;
        $gap = self::floorDiv($year, 100) - self::floorDiv($year, 400) - 2;

        return self::dayNumber($year, $month, $day) + $gap;
    }

    /** The given weekday relative to a day number (onOrAfter, after, onOrBefore, before). */
    public static function relativeWeekday(int $n, string $weekday, string $direction): int
    {
        $target = self::weekdayNumber($weekday);

        return match ($direction) {
            'onOrAfter' => $n + (($target - self::isoWeekday($n) + 7) % 7),
            'after' => $n + 1 + (($target - self::isoWeekday($n + 1) + 7) % 7),
            'onOrBefore' => $n - ((self::isoWeekday($n) - $target + 7) % 7),
            'before' => $n - 1 - ((self::isoWeekday($n - 1) - $target + 7) % 7),
            default => throw new HolidaysException(sprintf('Unknown direction "%s"', $direction)),
        };
    }
}
