<?php

declare(strict_types=1);

namespace craftsmith\holidays;

use InvalidArgumentException;

/**
 * Invalid input (unknown country, region, type, malformed date) or invalid
 * data (two observances match the same region and year).
 */
final class HolidaysException extends InvalidArgumentException
{
}
