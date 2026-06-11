/**
 * App-wide configuration. Change APP_NAME here to rebrand the whole app.
 */
export const APP_NAME = "Kosh";
export const APP_TAGLINE = "Your money, in one place. Private by default.";
export const APP_DESCRIPTION =
  "Track your net worth, investments, and expenses — all stored on your device.";

export const CURRENCY = "INR" as const;
export const LOCALE = "en-IN" as const;

export function formatCurrency(value: number, compact = false): string {
  return new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency: CURRENCY,
    maximumFractionDigits: 0,
    ...(compact ? { notation: "compact" as const } : {}),
  }).format(value);
}
