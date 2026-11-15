<?php

declare(strict_types=1);

namespace craftsmith\holidays\tests;

use craftsmith\holidays\Holidays;
use craftsmith\holidays\HolidaysException;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

/**
 * The shared cases of tests/fixtures/expectations.json (JS runs the same).
 */
final class ExpectationsTest extends TestCase
{
    /**
     * @return iterable<string, array{array<string, mixed>, string[]}>
     */
    public static function cases(): iterable
    {
        $data = Support::json('tests/fixtures/expectations.json');
        foreach ($data['cases'] as $case) {
            yield $case['name'] => [$case, $data['all']];
        }
    }

    /**
     * @param array<string, mixed> $case
     * @param string[] $all
     */
    #[DataProvider('cases')]
    public function testCase(array $case, array $all): void
    {
        $holidays = $case['data'] === 'fixtures'
            ? new Holidays(Support::root() . '/tests/fixtures/rules')
            : new Holidays();
        $args = $case['args'];
        if (($args[3] ?? null) === 'all') {
            $args[3] = $all;
        }
        if (!empty($case['error'])) {
            $this->expectException(HolidaysException::class);
        }
        $result = $holidays->{$case['method']}(...$args);

        match ($case['method']) {
            'holidays' => self::assertSame($case['expect'], array_map(Support::line(...), $result)),
            'isHoliday' => self::assertSame($case['expect'], $result),
            default => self::assertSame($case['expect'], $result === null ? null : Support::line($result)),
        };
    }
}
