import type { CRMColumn, CRMRecord } from "./crmTypes";

export function sortRecords<T extends CRMRecord>(
  rows: T[],
  key: keyof T & string,
  direction: "asc" | "desc"
): T[] {
  const cloned = [...rows];
  cloned.sort((a, b) => {
    const valueA = String(a[key] ?? "");
    const valueB = String(b[key] ?? "");

    const cmp = valueA.localeCompare(valueB, undefined, {
      numeric: true,
      sensitivity: "base",
    });

    return direction === "asc" ? cmp : -cmp;
  });

  return cloned;
}

export function filterRecords<T extends CRMRecord>(
  rows: T[],
  columns: CRMColumn<T>[],
  filters: Partial<Record<string, string>>,
  searchTerm?: string
): T[] {
  const columnKeys = new Set(columns.map((c) => c.key));
  const normalizedSearch = (searchTerm ?? "").trim().toLowerCase();

  return rows.filter((row) => {
    // 1. Global search term (across all visible columns)
    if (normalizedSearch) {
      const matchesSearch = visibleColumnsMatch(row, columns, normalizedSearch);
      if (!matchesSearch) return false;
    }

    // 2. Column-based filters (header filters)
    const columnMatch = columns.every((column) => {
      const filterValue = (filters[column.key] ?? "").trim().toLowerCase();
      if (!filterValue) return true;
      return String(row[column.key] ?? "").toLowerCase().includes(filterValue);
    });

    if (!columnMatch) return false;

    // 3. Extra filters (sidebar filters)
    return Object.entries(filters).every(([key, value]) => {
      if (typeof key === "string" && columnKeys.has(key as keyof T & string)) return true; // already handled
      const filterValue = (value ?? "").trim().toLowerCase();
      if (!filterValue) return true;
      
      // Fallback: try direct key access or find a mapping
      const rowValue = String(findRowValue(row, key) ?? "").toLowerCase();
      return rowValue.includes(filterValue);
    });
  });
}

function visibleColumnsMatch<T extends CRMRecord>(row: T, columns: CRMColumn<T>[], search: string): boolean {
  return columns.some((column) => {
    return String(row[column.key] ?? "").toLowerCase().includes(search);
  });
}

/** 
 * Handles key mismatches like 'product_name' vs 'productName' 
 */
function findRowValue<T extends CRMRecord>(row: T, key: string): any {
  if (key in row) return (row as any)[key];
  
  // Try camelCase conversion
  const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
  if (camelKey in row) return (row as any)[camelKey];

  // Try snake_case conversion
  const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  if (snakeKey in row) return (row as any)[snakeKey];

  return null;
}

/**
 * Formats a currency string as user types, preserving valid decimals and formatting
 * integer parts with commas for readability (e.g., "10000" -> "10,000", "10000.50" -> "10,000.50").
 */
export function formatCurrencyInput(value: string): string {
  if (!value) return "";

  // Strip anything that is not a digit or a period
  const clean = value.replace(/[^\d.]/g, "");
  if (!clean) return "";

  // If input starts with a period (e.g. ".5"), prepend "0"
  let normalized = clean;
  if (normalized.startsWith(".")) {
    normalized = "0" + normalized;
  }

  // Split into integer and decimal parts (at most one decimal point)
  const dotIndex = normalized.indexOf(".");
  let integerPart = "";
  let decimalPart: string | null = null;

  if (dotIndex !== -1) {
    integerPart = normalized.slice(0, dotIndex);
    // Ignore extra dots after the first one and limit to 2 decimal places
    decimalPart = normalized.slice(dotIndex + 1).replace(/\./g, "").slice(0, 2);
  } else {
    integerPart = normalized;
  }

  // Remove leading zeros from integer part, unless integerPart is just "0"
  if (integerPart.length > 1 && integerPart.startsWith("0")) {
    integerPart = integerPart.replace(/^0+/, "") || "0";
  }

  // Add comma separators to integer part
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  if (decimalPart !== null) {
    return `${formattedInteger}.${decimalPart}`;
  }

  return formattedInteger;
}

/**
 * Formats a numeric or string currency value for display with commas and decimals.
 * Examples: 10000 -> "10,000", 10000.50 -> "10,000.50"
 */
export function formatCurrencyDisplay(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "-";
  const num = typeof value === "number" ? value : Number(String(value).replace(/,/g, "").trim());
  if (isNaN(num)) return String(value);
  return num.toLocaleString("en-US", {
    minimumFractionDigits: Number.isInteger(num) ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Strips commas and parses string/number to clean numeric value for API payload.
 */
export function cleanCurrencyToNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return isNaN(value) ? null : value;
  const cleaned = String(value).replace(/,/g, "").trim();
  if (!cleaned) return null;
  const num = Number(cleaned);
  return isNaN(num) ? null : num;
}

