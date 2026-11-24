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

export function distributeChartPercentages(counts: number[], total: number): number[] {
  if (total <= 0 || counts.length === 0) return counts.map(() => 0);

  const exactHundredths = counts.map((count) => {
    const safeCount = Number.isFinite(count) && count > 0 ? count : 0;
    return (safeCount / total) * 10000;
  });
  const percentages = exactHundredths.map((value) => Math.floor(value));
  let remaining = 10000 - percentages.reduce((sum, value) => sum + value, 0);

  const remainders = exactHundredths
    .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
    .sort((left, right) => right.remainder - left.remainder || left.index - right.index);

  for (const item of remainders) {
    if (remaining <= 0) break;
    percentages[item.index] += 1;
    remaining -= 1;
  }

  return percentages.map((value) => value / 100);
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
      return matchesFilterValue(row[column.key], filters[column.key]);
    });

    if (!columnMatch) return false;

    // 3. Extra filters (sidebar filters)
    return Object.entries(filters).every(([key, value]) => {
      if (typeof key === "string" && columnKeys.has(key as keyof T & string)) return true; // already handled
      // Fallback: try direct key access or find a mapping
      return matchesFilterValue(findRowValue(row, key), value);
    });
  });
}

function matchesFilterValue(rowValue: unknown, filterValue: string | undefined): boolean {
  if (!filterValue?.trim()) return true;

  const normalizedRowValue = String(rowValue ?? "").toLowerCase();
  return (filterValue ?? "")
    .split("\u001f")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
    .some((value) => normalizedRowValue.includes(value));
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
