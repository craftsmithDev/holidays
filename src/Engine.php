<?php

declare(strict_types=1);

namespace craftsmith\holidays;

/**
 * Evaluates the compiled rules of one country (src/data/<cc>.json) and
 * builds the year document (json/<cc>/<year>.json). Semantics: see
 * docs/format.md. Mirrors js/engine.js.
 */
final class Engine
{
    public const FORMAT = 1;
    public const TYPES = ['public', 'bank', 'observance'];
    public const MIN_YEAR = 1583;
    public const MAX_YEAR = 9999;

    /**
     * @param array<string, mixed> $item
     */
    private static function inRange(array $item, int $year): bool
    {
        return (!isset($item['from']) || $year >= $item['from']) && (!isset($item['to']) || $year <= $item['to']);
    }

    /**
     * @param array<mixed> $date one rule or a list of rules
     * @return array<string, mixed>|null
     */
    private static function pickRule(array $date, int $year, string $where): ?array
    {
        $rules = array_is_list($date) ? $date : [$date];
        $valid = array_values(array_filter($rules, fn(array $rule) => self::inRange($rule, $year)));
        if (count($valid) > 1) {
            throw new HolidaysException(sprintf('%s: more than one date rule is valid in %d', $where, $year));
        }

        return $valid[0] ?? null;
    }

    /**
     * Day numbers a rule yields for a year (offset and adjust applied).
     *
     * @param array<string, mixed> $rule
     * @return int[]
     */
    public static function evaluateRule(array $rule, int $year): array
    {
        switch ($rule['type']) {
            case 'fixed':
                $days = Calendar::isValidDate($year, $rule['month'], $rule['day']) ? [Calendar::dayNumber($year, $rule['month'], $rule['day'])] : [];
                break;
            case 'easter':
                $days = [($rule['calendar'] ?? 'western') === 'orthodox' ? Calendar::orthodoxEaster($year) : Calendar::westernEaster($year)];
                break;
            case 'nthWeekday':
                $days = self::nthWeekday($year, $rule['month'], $rule['weekday'], $rule['nth']);
                break;
            case 'relativeWeekday':
                $days = array_map(
                    fn(int $n) => Calendar::relativeWeekday($n, $rule['weekday'], $rule['direction']),
                    self::evaluateRule($rule['base'], $year),
                );
                break;
            case 'list':
                $days = [];
                foreach ($rule['dates'] as $text) {
                    $n = Calendar::parse($text);
                    if ($n !== null && Calendar::yearOf($n) === $year) {
                        $days[] = $n;
                    }
                }
                sort($days);

                return $days;
            default:
                throw new HolidaysException(sprintf('Unknown rule type "%s"', $rule['type']));
        }
        $offset = $rule['offset'] ?? 0;
        $out = [];
        foreach ($days as $n) {
            $adjusted = self::applyAdjust($rule['adjust'] ?? null, $n + $offset, $year);
            if ($adjusted !== null) {
                $out[] = $adjusted;
            }
        }

        return $out;
    }

    /**
     * @return int[]
     */
    private static function nthWeekday(int $year, int $month, string $weekday, int $nth): array
    {
        $target = Calendar::weekdayNumber($weekday);
        if ($nth > 0) {
            $first = Calendar::dayNumber($year, $month, 1);
            $n = $first + (($target - Calendar::isoWeekday($first) + 7) % 7) + 7 * ($nth - 1);
        } else {
            $last = ($month === 12 ? Calendar::dayNumber($year + 1, 1, 1) : Calendar::dayNumber($year, $month + 1, 1)) - 1;
            $n = $last - ((Calendar::isoWeekday($last) - $target + 7) % 7) - 7 * (-$nth - 1);
        }

        return Calendar::civil($n)[1] === $month ? [$n] : [];
    }

    /**
     * Whether all keys of a condition hold for a day number.
     *
     * @param array<string, mixed> $when
     */
    public static function conditionHolds(array $when, int $n, int $year): bool
    {
        if (isset($when['weekday']) && !in_array(Calendar::isoWeekday($n), array_map(Calendar::weekdayNumber(...), $when['weekday']), true)) {
            return false;
        }
        if (isset($when['sameDateAs']) && !in_array($n, self::evaluateRule($when['sameDateAs'], $year), true)) {
            return false;
        }
        if (isset($when['between'])) {
            $from = self::evaluateRule($when['between']['from'], $year);
            $to = self::evaluateRule($when['between']['to'], $year);
            if ($from === [] || $to === [] || $n < $from[0] || $n > $to[count($to) - 1]) {
                return false;
            }
        }

        return true;
    }

    /**
     * The first matching adjust entry, applied; null when it says skip.
     *
     * @param array<int, array<string, mixed>>|null $adjust
     */
    public static function applyAdjust(?array $adjust, int $n, int $year): ?int
    {
        foreach ($adjust ?? [] as $entry) {
            if (!self::conditionHolds($entry['when'], $n, $year)) {
                continue;
            }
            if (!empty($entry['skip'])) {
                return null;
            }
            if (isset($entry['offset'])) {
                return $n + $entry['offset'];
            }

            return Calendar::relativeWeekday($n, $entry['moveTo']['weekday'], $entry['moveTo']['direction']);
        }

        return $n;
    }

    /**
     * The observance that applies to a region in a year; the most specific
     * scope wins, two equally specific matches are a data error.
     *
     * @param array<string, mixed> $holiday
     * @return array<string, mixed>|null
     */
    private static function pickObservance(array $holiday, ?string $region, int $year): ?array
    {
        $best = null;
        $bestRank = -1;
        foreach ($holiday['observances'] as $observance) {
            if (!self::inRange($observance, $year)) {
                continue;
            }
            if (isset($observance['years']) && !in_array($year, $observance['years'], true)) {
                continue;
            }
            if ($observance['regions'] === 'all') {
                if ($region !== null && in_array($region, $observance['except'] ?? [], true)) {
                    continue;
                }
                $rank = 0;
            } elseif ($region !== null && in_array($region, $observance['regions'], true)) {
                $rank = 1;
            } else {
                continue;
            }
            if ($rank === $bestRank) {
                throw new HolidaysException(sprintf('%s: two observances match %s in %d', $holiday['id'], $region ?? 'the country', $year));
            }
            if ($rank > $bestRank) {
                $best = $observance;
                $bestRank = $rank;
            }
        }

        return $best;
    }

    /**
     * @param array<string, mixed> $rules
     * @return array<int, array<string, mixed>>
     */
    private static function baseOccurrences(array $rules, ?string $region, int $year): array
    {
        $out = [];
        foreach ($rules['holidays'] as $index => $holiday) {
            if (!self::inRange($holiday, $year)) {
                continue;
            }
            $observance = self::pickObservance($holiday, $region, $year);
            if ($observance === null) {
                continue;
            }
            $rule = self::pickRule($observance['date'] ?? $holiday['date'], $year, $holiday['id']);
            if ($rule === null) {
                continue;
            }
            foreach (self::evaluateRule($rule, $year) as $ruleDay) {
                $n = self::applyAdjust($observance['adjust'] ?? null, $ruleDay, $year);
                if ($n === null || Calendar::yearOf($n) !== $year) {
                    continue;
                }
                $out[] = ['n' => $n, 'index' => $index, 'holiday' => $holiday, 'observance' => $observance, 'substituteFor' => null];
            }
        }

        return $out;
    }

    /**
     * @param array<string, mixed> $occurrence
     */
    private static function blocksSubstitute(array $occurrence): bool
    {
        return $occurrence['observance']['type'] === 'public' && !isset($occurrence['observance']['startTime']);
    }

    /**
     * All occurrences of one region in one year, substitutes included.
     *
     * @param array<string, mixed> $rules
     * @return array<int, array<string, mixed>>
     */
    public static function occurrences(array $rules, ?string $region, int $year): array
    {
        $all = $year > self::MIN_YEAR ? self::baseOccurrences($rules, $region, $year - 1) : [];
        array_push($all, ...self::baseOccurrences($rules, $region, $year));
        usort($all, fn(array $a, array $b) => ($a['n'] <=> $b['n']) ?: ($a['index'] <=> $b['index']));

        $taken = [];
        foreach ($all as $occurrence) {
            if (self::blocksSubstitute($occurrence)) {
                $taken[$occurrence['n']] = true;
            }
        }
        $substitutes = [];
        foreach ($all as $occurrence) {
            $substitute = $occurrence['observance']['substitute'] ?? null;
            if ($substitute === null || !self::conditionHolds($substitute['when'], $occurrence['n'], Calendar::yearOf($occurrence['n']))) {
                continue;
            }
            $avoid = array_map(Calendar::weekdayNumber(...), $substitute['avoidWeekdays']);
            $n = $occurrence['n'] + 1;
            while (in_array(Calendar::isoWeekday($n), $avoid, true) || isset($taken[$n])) {
                $n++;
            }
            $taken[$n] = true;
            $substitutes[] = ['n' => $n, 'substituteFor' => $occurrence['n']] + $occurrence;
        }

        return array_values(array_filter(
            array_merge($all, $substitutes),
            fn(array $o) => Calendar::yearOf($o['n']) === $year,
        ));
    }

    public static function checkYear(int $year): void
    {
        if ($year < self::MIN_YEAR || $year > self::MAX_YEAR) {
            throw new HolidaysException(sprintf('Year must be an integer from %d to %d, got %d', self::MIN_YEAR, self::MAX_YEAR, $year));
        }
    }

    /**
     * The year document of a country (see schema/year.schema.json).
     *
     * @param array<string, mixed> $rules
     * @return array<string, mixed>
     */
    public static function buildYear(array $rules, int $year): array
    {
        self::checkYear($year);
        $regions = $rules['regions'] !== [] ? array_column($rules['regions'], 'code') : [null];
        $sourceOrder = array_keys($rules['sources']);
        $groups = [];

        foreach ($regions as $region) {
            foreach (self::occurrences($rules, $region, $year) as $o) {
                $type = $o['observance']['type'];
                $startTime = $o['observance']['startTime'] ?? null;
                $substituteFor = $o['substituteFor'] === null ? null : Calendar::format($o['substituteFor']);
                $key = implode('|', [$o['n'], $o['holiday']['id'], $type, $startTime ?? '', $substituteFor ?? '']);
                if (!isset($groups[$key])) {
                    $groups[$key] = [
                        'n' => $o['n'],
                        'index' => $o['index'],
                        'holiday' => $o['holiday'],
                        'type' => $type,
                        'startTime' => $startTime,
                        'substituteFor' => $substituteFor,
                        'regions' => [],
                        'sources' => [],
                    ];
                }
                if ($region !== null) {
                    $groups[$key]['regions'][] = $region;
                }
                foreach (array_merge($o['holiday']['sources'] ?? [], $o['observance']['sources']) as $id) {
                    $groups[$key]['sources'][$id] = true;
                }
            }
        }

        $list = array_values($groups);
        usort($list, fn(array $a, array $b) => ($a['n'] <=> $b['n'])
            ?: ($a['index'] <=> $b['index'])
            ?: (($a['substituteFor'] === null ? 0 : 1) <=> ($b['substituteFor'] === null ? 0 : 1))
            ?: (array_search($a['type'], self::TYPES, true) <=> array_search($b['type'], self::TYPES, true)));

        $used = [];
        $holidays = [];
        foreach ($list as $g) {
            $nationwide = $regions[0] === null || count($g['regions']) === count($regions);
            $sources = array_values(array_filter($sourceOrder, fn(string $id) => isset($g['sources'][$id])));
            foreach ($sources as $id) {
                $used[$id] = true;
            }
            $holidays[] = [
                'date' => Calendar::format($g['n']),
                'id' => $g['holiday']['id'],
                'name' => $g['holiday']['names'],
                'type' => $g['type'],
                'startTime' => $g['startTime'],
                'substituteFor' => $g['substituteFor'],
                'nationwide' => $nationwide,
                'regions' => $nationwide ? [] : $g['regions'],
                'sources' => $sources,
            ];
        }
        $sources = [];
        foreach ($sourceOrder as $id) {
            if (isset($used[$id])) {
                $sources[$id] = $rules['sources'][$id];
            }
        }

        return [
            'format' => self::FORMAT,
            'country' => $rules['code'],
            'year' => $year,
            'holidays' => $holidays,
            'sources' => $sources,
        ];
    }

    /**
     * Same bytes as js/engine.js encode(): 2-space indent, unescaped slashes
     * and Unicode, final newline.
     */
    public static function encode(mixed $document): string
    {
        $json = json_encode(
            self::objects($document),
            JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_LINE_TERMINATORS | JSON_THROW_ON_ERROR,
        );
        $json = (string)preg_replace_callback('/^( +)/m', fn(array $m) => str_repeat(' ', intdiv(strlen($m[1]), 2)), $json);

        return $json . "\n";
    }

    /**
     * Empty associative arrays where JSON wants an object ({}): the sources map.
     */
    private static function objects(mixed $document): mixed
    {
        if (is_array($document) && array_key_exists('sources', $document) && $document['sources'] === [] && array_key_exists('holidays', $document)) {
            $document['sources'] = (object)[];
        }

        return $document;
    }
}
