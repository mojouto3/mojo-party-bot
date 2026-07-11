const el = require('./locales/el.json');
const en = require('./locales/en.json');

const LOCALES = { el, en };
const DEFAULT_LOCALE = 'en';

/**
 * Converts a Discord locale code (e.g. 'el', 'en-US', 'de') into one
 * of our supported locales. Extensible: add a new locale file under
 * locales/ + one line here.
 */
function resolveLocale(discordLocale) {
    if (!discordLocale) return DEFAULT_LOCALE;
    if (discordLocale.startsWith('el')) return 'el';
    if (discordLocale.startsWith('en')) return 'en';
    return DEFAULT_LOCALE;
}

function getNested(obj, keyPath) {
    return keyPath.split('.').reduce((acc, part) => (acc ? acc[part] : undefined), obj);
}

/**
 * Translates a key (e.g. "hub.button_create") into the right locale,
 * with optional {var} placeholders.
 *
 * @param {string} key - dot notation key, e.g. "setup.success"
 * @param {string} discordLocale - interaction.locale or interaction.guildLocale
 * @param {object} vars - values for {var} placeholders inside the string
 */
function t(key, discordLocale, vars = {}) {
    const locale = resolveLocale(discordLocale);
    let str = getNested(LOCALES[locale], key);

    if (str === undefined) {
        // Fall back to English if the key is missing from the chosen locale
        str = getNested(LOCALES[DEFAULT_LOCALE], key);
    }
    if (str === undefined) {
        console.warn(`Missing i18n key: "${key}"`);
        return key;
    }

    return str.replace(/\{(\w+)\}/g, (match, varName) =>
        vars[varName] !== undefined ? vars[varName] : match
    );
}

module.exports = { t, resolveLocale };
