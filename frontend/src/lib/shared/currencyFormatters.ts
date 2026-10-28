/**
 * Helpers for currency formatting and input handling in CRM modules (e.g. Sales -> Leads Annual Revenue).
 */

/**
 * Automatically formats a currency / revenue input value while typing or pasting.
 * Accepts valid decimal values (e.g. 12345.67) and automatically inserts comma separators (e.g. 12,345.67).
 * - Restricts to digits and at most one decimal point.
 * - Restricts to max 2 decimal places.
 * - Preserves trailing dot so the user can continue typing decimals (e.g. "1,234.").
 */
export function formatCurrencyInput(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value).trim();
  if (!str) return "";

  // Strip anything that is not a digit or period
  const cleaned = str.replace(/[^\d.]/g, "");
  if (!cleaned) return "";

  // Split integer and decimal parts on the first period
  const firstDotIndex = cleaned.indexOf(".");
  let intPart = firstDotIndex === -1 ? cleaned : cleaned.slice(0, firstDotIndex);
  let decPart = firstDotIndex === -1 ? null : cleaned.slice(firstDotIndex + 1).replace(/\./g, "");

  // If user started with dot (e.g. ".5"), treat integer part as "0"
  if (intPart === "" && firstDotIndex !== -1) {
    intPart = "0";
  }

  // Prevent multiple leading zeroes (e.g. "05" -> "5", "00" -> "0")
  if (intPart.length > 1 && intPart.startsWith("0")) {
    intPart = intPart.replace(/^0+/, "") || "0";
  }

  // Format integer part with commas (thousand separators: 1,000,000)
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  if (decPart !== null) {
    // Restrict to at most 2 decimal places
    const trimmedDec = decPart.slice(0, 2);
    return `${formattedInt || "0"}.${trimmedDec}`;
  }

  return formattedInt;
}

/**
 * Cleans trailing dot if present on blur (e.g. "1,234." -> "1,234").
 */
export function cleanCurrencyBlur(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const formatted = formatCurrencyInput(value);
  return formatted.endsWith(".") ? formatted.slice(0, -1) : formatted;
}

/**
 * Parses a currency input string (e.g. "1,234,567.89") into a clean number.
 */
export function parseCurrencyValue(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0;
  const raw = String(value).replace(/,/g, "").trim();
  const num = Number(raw);
  return Number.isFinite(num) ? num : 0;
}

/**
 * Formats a currency number for read-only display with comma separators.
 * e.g. 5000000 -> "Rs. 5,000,000", 1234.56 -> "Rs. 1,234.56"
 */
export function formatCurrencyDisplay(
  value: string | number | null | undefined,
  prefix = "Rs. "
): string {
  if (value === null || value === undefined || value === "") return "-";
  const num = typeof value === "number" ? value : Number(String(value).replace(/,/g, "").trim());
  if (!Number.isFinite(num)) return "-";
  if (num === 0) return "-";
  return `${prefix}${num.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}
