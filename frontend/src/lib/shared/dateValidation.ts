export type DateRangeRule = "start" | "future";

export type CalendarDateField = {
  label: string;
  value?: string | null;
  rule: DateRangeRule;
};

export function getDateRangeRule(label: string): DateRangeRule {
  return /\b(end|closing|due|expiry|valid until|renewal)\b/i.test(label) ? "future" : "start";
}

type DateBounds = {
  min: string;
  max: string;
};

function formatYear(year: number) {
  return String(year).padStart(4, "0");
}

function formatIsoDate(year: number, month: number, day: number) {
  return `${formatYear(year)}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function localDateParts(date: Date) {
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  };
}

function isValidCalendarDate(day: number, month: number, year: number) {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false;
  if (year < 1 || year > 9999 || month < 1 || month > 12) return false;

  const isLeapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, isLeapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day >= 1 && day <= daysInMonth[month - 1];
}

export function getDateBounds(rule: DateRangeRule, now = new Date()): DateBounds {
  const currentYear = now.getFullYear();
  const min =
    rule === "future"
      ? (() => {
          const tomorrow = new Date(currentYear, now.getMonth(), now.getDate() + 1);
          const parts = localDateParts(tomorrow);
          return formatIsoDate(parts.year, parts.month, parts.day);
        })()
      : `${formatYear(currentYear - 100)}-01-01`;
  const max = `${formatYear(currentYear + 100)}-12-31`;

  return { min, max };
}

export function isValidCalendarDateValue(
  value: string,
  rule: DateRangeRule,
  format: "iso" | "dd-mm-yyyy" = "iso",
  now = new Date()
) {
  const match =
    format === "dd-mm-yyyy"
      ? /^(\d{2})-(\d{2})-(\d{4})$/.exec(value)
      : /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;

  const [day, month, year] =
    format === "dd-mm-yyyy"
      ? [Number(match[1]), Number(match[2]), Number(match[3])]
      : [Number(match[3]), Number(match[2]), Number(match[1])];
  if (!isValidCalendarDate(day, month, year)) return false;

  const isoDate = formatIsoDate(year, month, day);
  const { min, max } = getDateBounds(rule, now);
  return isoDate >= min && isoDate <= max;
}

export function getCalendarDateInputValue(
  value: string,
  rule: DateRangeRule,
  now = new Date()
) {
  if (!value) return "";
  if (isValidCalendarDateValue(value, rule, "iso", now)) return value;
  return "";
}

function isValidDatePrefix(
  digits: string,
  format: "iso" | "dd-mm-yyyy",
  rule: DateRangeRule,
  now: Date
) {
  const yearPrefix = format === "iso" ? digits.slice(0, 4) : digits.slice(4, 8);
  const monthPrefix = format === "iso" ? digits.slice(4, 6) : digits.slice(2, 4);
  const dayPrefix = format === "iso" ? digits.slice(6, 8) : digits.slice(0, 2);
  const { min, max } = getDateBounds(rule, now);
  const firstYear = Number(min.slice(0, 4));
  const lastYear = Number(max.slice(0, 4));

  for (let year = firstYear; year <= lastYear; year += 1) {
    const yearText = formatYear(year);
    if (yearPrefix && !yearText.startsWith(yearPrefix)) continue;

    for (let month = 1; month <= 12; month += 1) {
      const monthText = String(month).padStart(2, "0");
      if (monthPrefix && !monthText.startsWith(monthPrefix)) continue;
      const maxDay = new Date(year, month, 0).getDate();

      for (let day = 1; day <= maxDay; day += 1) {
        const dayText = String(day).padStart(2, "0");
        if (dayPrefix && !dayText.startsWith(dayPrefix)) continue;
        const dateValue = formatIsoDate(year, month, day);
        if (dateValue >= min && dateValue <= max) return true;
      }
    }
  }

  return false;
}

export function formatCalendarDateInput(
  value: string,
  format: "iso" | "dd-mm-yyyy",
  rule: DateRangeRule,
  now = new Date()
) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  let accepted = "";

  for (const digit of digits) {
    const candidate = accepted + digit;
    if (!isValidDatePrefix(candidate, format, rule, now)) break;
    accepted = candidate;
  }

  if (format === "iso") {
    if (accepted.length <= 4) return accepted;
    if (accepted.length <= 6) return `${accepted.slice(0, 4)}-${accepted.slice(4)}`;
    return `${accepted.slice(0, 4)}-${accepted.slice(4, 6)}-${accepted.slice(6)}`;
  }

  if (accepted.length <= 2) return accepted;
  if (accepted.length <= 4) return `${accepted.slice(0, 2)}-${accepted.slice(2)}`;
  return `${accepted.slice(0, 2)}-${accepted.slice(2, 4)}-${accepted.slice(4)}`;
}

export function getCalendarDateError(rule: DateRangeRule, format: "iso" | "dd-mm-yyyy" = "iso") {
  const { min, max } = getDateBounds(rule);
  const displayFormat = format === "iso" ? "yyyy-mm-dd" : "dd-mm-yyyy";
  return `Enter a valid date in ${displayFormat} format between ${min} and ${max}.`;
}

export function getCalendarDateFieldsError(fields: CalendarDateField[]) {
  const invalidField = fields.find(({ value, rule }) => {
    const dateValue = value?.includes("T") ? value.slice(0, 10) : value;
    return dateValue ? !isValidCalendarDateValue(dateValue, rule) : false;
  });
  return invalidField
    ? `${invalidField.label}: ${getCalendarDateError(invalidField.rule)}`
    : null;
}
