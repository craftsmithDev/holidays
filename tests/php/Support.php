<?php

declare(strict_types=1);

namespace craftsmith\holidays\tests;

final class Support
{
    public static function root(): string
    {
        return dirname(__DIR__, 2);
    }

    /**
     * @return array<string, mixed>
     */
    public static function json(string $path): array
    {
        return json_decode((string)file_get_contents(self::root() . '/' . $path), true, 512, JSON_THROW_ON_ERROR);
    }

    /**
     * The line format of tests/fixtures/expectations.json.
     *
     * @param array<string, mixed> $h
     */
    public static function line(array $h): string
    {
        return $h['date'] . ' ' . $h['id']
            . ($h['substituteFor'] !== null ? ' for ' . $h['substituteFor'] : '')
            . ($h['startTime'] !== null ? ' from ' . $h['startTime'] : '')
            . ' ' . $h['type'];
    }
}
