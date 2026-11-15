<?php

declare(strict_types=1);

namespace craftsmith\holidays;

use DateTimeInterface;

/**
 * Holidays over a set of compiled country rules (src/data/<cc>.json).
 * Method names, arguments and results match the JS class Holidays of
 * @craftsmith/holidays. Results are plain arrays shaped like the JSON files.
 *
 * @phpstan-type Holiday array{date: string, id: string, name: array<string, string>, type: string, startTime: ?string, substituteFor: ?string, nationwide: bool, regions: string[], sources: string[]}
 */
final class Holidays
{
    private const DEFAULT_TYPES = ['public'];
    private const SEARCH_YEARS = 10;

    /**
     * @var array<string, array<string, mixed>> compiled rules by country code
     */
    private array $rules = [];

    /**
     * @var array<string, array<string, mixed>> year documents by "CC|year"
     */
    private array $cache = [];

    /**
     * @param string|null $rulesDir folder with <cc>.json rule files; default: the bundled src/data
     */
    public function __construct(?string $rulesDir = null)
    {
        $dir = $rulesDir ?? __DIR__ . '/data';
        foreach (glob(rtrim($dir, '/') . '/*.json') ?: [] as $file) {
            $data = json_decode((string)file_get_contents($file), true, 512, JSON_THROW_ON_ERROR);
            $this->rules[$data['code']] = $data;
        }
        ksort($this->rules);
    }

    /**
     * Countries with their names, languages and regions.
     *
     * @return array<int, array{code: string, names: array<string, string>, languages: string[], regions: array<int, array{code: string, names: array<string, string>}>}>
     */
    public function countries(): array
    {
        return array_values(array_map(fn(array $data) => $this->country($data), $this->rules));
    }

    /**
     * @return array<int, array{code: string, names: array<string, string>}>
     */
    public function regions(string $country): array
    {
        return $this->country($this->rulesOf($country))['regions'];
    }

    /**
     * The full year document (identical to json/<cc>/<year>.json).
     *
     * @return array<string, mixed>
     */
    public function year(string $country, int $year): array
    {
        $rules = $this->rulesOf($country);
        $key = $rules['code'] . '|' . $year;

        return $this->cache[$key] ??= Engine::buildYear($rules, $year);
    }

    /**
     * Holidays of a year. Without a region: only the nationwide ones.
     *
     * @param string|null $region e.g. 'ZH' or 'CH-ZH'
     * @param string[]|null $types default ['public']
     * @return array<int, Holiday>
     */
    public function holidays(string $country, int $year, ?string $region = null, ?array $types = null): array
    {
        $rules = $this->rulesOf($country);
        $code = $this->regionOf($rules, $region);
        $wanted = $this->typesOf($types);

        return array_values(array_filter(
            $this->year($rules['code'], $year)['holidays'],
            fn(array $h) => in_array($h['type'], $wanted, true) && ($h['nationwide'] || ($code !== null && in_array($code, $h['regions'], true))),
        ));
    }

    /**
     * Whether a date is a holiday of the given types.
     *
     * @param string|DateTimeInterface $date 'YYYY-MM-DD' (a DateTimeInterface is read in its own time zone)
     * @param string[]|null $types
     */
    public function isHoliday(string|DateTimeInterface $date, string $country, ?string $region = null, ?array $types = null): bool
    {
        $text = $this->dateOf($date);
        foreach ($this->holidays($country, Calendar::yearOf((int)Calendar::parse($text)), $region, $types) as $holiday) {
            if ($holiday['date'] === $text) {
                return true;
            }
        }

        return false;
    }

    /**
     * The first holiday strictly after a date, or null within ten years.
     *
     * @param string[]|null $types
     * @return Holiday|null
     */
    public function next(string|DateTimeInterface $date, string $country, ?string $region = null, ?array $types = null): ?array
    {
        $text = $this->dateOf($date);
        $start = (int)substr($text, 0, 4);
        for ($year = $start; $year <= min($start + self::SEARCH_YEARS, Engine::MAX_YEAR); $year++) {
            foreach ($this->holidays($country, $year, $region, $types) as $holiday) {
                if ($holiday['date'] > $text) {
                    return $holiday;
                }
            }
        }

        return null;
    }

    /**
     * The last holiday strictly before a date, or null within ten years.
     *
     * @param string[]|null $types
     * @return Holiday|null
     */
    public function previous(string|DateTimeInterface $date, string $country, ?string $region = null, ?array $types = null): ?array
    {
        $text = $this->dateOf($date);
        $start = (int)substr($text, 0, 4);
        for ($year = $start; $year >= max($start - self::SEARCH_YEARS, Engine::MIN_YEAR); $year--) {
            $found = array_values(array_filter($this->holidays($country, $year, $region, $types), fn(array $h) => $h['date'] < $text));
            if ($found !== []) {
                return $found[count($found) - 1];
            }
        }

        return null;
    }

    /**
     * @param array<string, mixed> $data
     * @return array{code: string, names: array<string, string>, languages: string[], regions: array<int, array{code: string, names: array<string, string>}>}
     */
    private function country(array $data): array
    {
        return [
            'code' => $data['code'],
            'names' => $data['names'],
            'languages' => $data['languages'],
            'regions' => array_map(fn(array $r) => ['code' => $r['code'], 'names' => $r['names']], $data['regions']),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function rulesOf(string $country): array
    {
        $code = strtoupper($country);
        if (!isset($this->rules[$code])) {
            throw new HolidaysException(sprintf('Unknown country "%s"', $country));
        }

        return $this->rules[$code];
    }

    /**
     * @param array<string, mixed> $rules
     */
    private function regionOf(array $rules, ?string $region): ?string
    {
        if ($region === null || $region === '') {
            return null;
        }
        $text = strtoupper($region);
        $code = str_contains($text, '-') ? $text : $rules['code'] . '-' . $text;
        if (!in_array($code, array_column($rules['regions'], 'code'), true)) {
            throw new HolidaysException(sprintf('Unknown region "%s" for %s', $region, $rules['code']));
        }

        return $code;
    }

    /**
     * @param string[]|null $types
     * @return string[]
     */
    private function typesOf(?array $types): array
    {
        if ($types === null) {
            return self::DEFAULT_TYPES;
        }
        foreach ($types as $type) {
            if (!in_array($type, Engine::TYPES, true)) {
                throw new HolidaysException(sprintf('Unknown type "%s"', $type));
            }
        }

        return $types;
    }

    private function dateOf(string|DateTimeInterface $date): string
    {
        $text = $date instanceof DateTimeInterface ? $date->format('Y-m-d') : $date;
        $n = Calendar::parse($text);
        if ($n === null) {
            throw new HolidaysException(sprintf('Date must be YYYY-MM-DD, got "%s"', $text));
        }
        Engine::checkYear(Calendar::yearOf($n));

        return $text;
    }
}
