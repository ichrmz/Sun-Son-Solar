<?php

/**
 * Stand-in for PHP's "Locale" class.
 *
 * CodeIgniter calls Locale::setDefault() and Locale::getDefault() on every request.
 * Those come from PHP's "intl" extension, which XAMPP leaves turned off.
 * public/index.php loads this file ONLY when intl is missing, so the site still works
 * on PCs where php.ini cannot be edited (like the school lab).
 * If intl is turned on, this file is never loaded.
 */
class Locale
{
    private static string $default = 'en';

    public static function setDefault(string $locale): bool
    {
        self::$default = $locale;

        return true;
    }

    public static function getDefault(): string
    {
        return self::$default;
    }

    public static function acceptFromHttp(string $header)
    {
        return 'en';
    }

    public static function getPrimaryLanguage(string $locale): string
    {
        return strtolower(substr($locale, 0, 2));
    }
}
