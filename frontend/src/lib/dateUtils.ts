const DATE_PATTERN = /^(\d{2})-(\d{2})-(\d{4})$/;
const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export type DatePickerBoundsOptions = {
  min?: string;
  max?: string;
  futureOnly?: boolean;
  today?: Date;
};

function toLocalIsoDate(date: Date): string {
  return `${String(date.getFullYear()).padStart(4, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function getDatePickerBounds({
  min,
  max,
  futureOnly = false,
  today = new Date(),
}: DatePickerBoundsOptions = {}) {
  const currentYear = today.getFullYear();
  const yearMin = `${String(Math.max(1, currentYear - 100)).padStart(4, "0")}-01-01`;
  const yearMax = `${String(Math.min(9999, currentYear + 100)).padStart(4, "0")}-12-31`;
  const minimumCandidates = [yearMin];
  if (min) minimumCandidates.push(min);
  if (futureOnly) minimumCandidates.push(toLocalIsoDate(today));
  const maximumCandidates = [yearMax];
  if (max) maximumCandidates.push(max);
  const minimum = minimumCandidates.sort()[minimumCandidates.length - 1];
  const maximum = maximumCandidates.sort()[0];

  return { min: minimum, max: maximum };
}

export function parseDateInput(value: string): string | null {
  const match = DATE_PATTERN.exec(value);
  if (!match) return null;

  const [, dayText, monthText, yearText] = match;
  const day = Number(dayText);
  const month = Number(monthText);
  const year = Number(yearText);
  if (year < 1 || month < 1 || month > 12) return null;

  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
  if (day < 1 || day > daysInMonth) return null;

  return `${yearText}-${monthText}-${dayText}`;
}

export function maskDateInput(value: string, today = new Date()): string | null {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) {
    return digits.length === 2 && (Number(digits) < 1 || Number(digits) > 31) ? null : digits;
  }

  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4);
  if (month.length === 2 && (Number(month) < 1 || Number(month) > 12)) return null;
  if (year.length === 4) {
    if (!parseDateInput(`${day}-${month}-${year}`)) return null;
    const { min, max } = getDatePickerBounds({ today });
    if (Number(year) < Number(min.slice(0, 4)) || Number(year) > Number(max.slice(0, 4))) return null;
  }

  if (digits.length <= 4) return `${day}-${month}`;
  return `${day}-${month}-${year}`;
}

export function isDateWithinBounds(
  isoDate: string,
  bounds: Pick<DatePickerBoundsOptions, "min" | "max">,
): boolean {
  return (!bounds.min || isoDate >= bounds.min) && (!bounds.max || isoDate <= bounds.max);
}

export function formatDateForInput(value: string | null | undefined): string {
  if (!value) return "";
  const match = ISO_DATE_PATTERN.exec(value.slice(0, 10));
  if (!match) return "";

  const [, year, month, day] = match;
  return parseDateInput(`${day}-${month}-${year}`) ? `${day}-${month}-${year}` : "";
}

export function formatDateForDisplay(value: string | null | undefined): string {
  return formatDateForInput(value);
}

export function formatDateTimeForDisplay(value: string | null | undefined): string {
  if (!value) return "";
  const dateOnly = formatDateForInput(value);
  if (dateOnly && !/[T ]\d{2}:\d{2}/.test(value)) return dateOnly;
  if (/^\d{4}-\d{2}-\d{2}/.test(value) && !dateOnly) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const datePart = `${String(date.getDate()).padStart(2, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getFullYear()).padStart(4, "0")}`;
  if (!/[T ]\d{2}:\d{2}/.test(value)) return datePart;
  return `${datePart} ${date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`;
}

export function validateDatePickerInputs(): boolean {
  const invalidInput = Array.from(
    document.querySelectorAll<HTMLInputElement>("[data-date-picker]"),
  ).find((input) => !input.checkValidity());
  if (!invalidInput) return true;

  invalidInput.reportValidity();
  invalidInput.focus();
  return false;
}
