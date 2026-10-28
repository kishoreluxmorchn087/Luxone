import { forwardRef, useEffect, useMemo, useRef, useState, type ChangeEvent, type InputHTMLAttributes } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { formatDateForInput, getDatePickerBounds, isDateWithinBounds, maskDateInput, parseDateInput } from "../../lib/dateUtils";

type DatePickerProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "onChange"> & {
  value: string;
  onChange: (value: string) => void;
  onValidityChange?: (valid: boolean) => void;
  futureOnly?: boolean;
};

function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function weekday(year: number, month: number, day: number) {
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, month - 1, day);
  return (date.getUTCDay() + 6) % 7;
}

function toIsoDate(year: number, month: number, day: number) {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(function DatePicker({
  value,
  onChange,
  onValidityChange,
  className = "",
  required = false,
  disabled = false,
  futureOnly = false,
  min,
  max,
  ...inputProps
}, forwardedRef) {
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const isoValue = value?.slice(0, 10) || "";
  const bounds = getDatePickerBounds({
    min: typeof min === "string" ? min : undefined,
    max: typeof max === "string" ? max : undefined,
    futureOnly,
  });
  const minimumDate = bounds.min;
  const maximumDate = bounds.max;
  const [draft, setDraft] = useState(() => formatDateForInput(isoValue));
  const [lastIsoValue, setLastIsoValue] = useState(isoValue);
  const [calendarOpen, setCalendarOpen] = useState(false);
  if (isoValue !== lastIsoValue) {
    setLastIsoValue(isoValue);
    setDraft(formatDateForInput(isoValue));
  }
  const selectedDate = parseDateInput(draft);
  const isOutsideRange = Boolean(
    selectedDate &&
    !isDateWithinBounds(selectedDate, bounds),
  );
  const calendarDate = selectedDate || parseDateInput(formatDateForInput(isoValue)) || toIsoDate(
    new Date().getFullYear(),
    new Date().getMonth() + 1,
    new Date().getDate(),
  );
  const [yearText, monthText] = calendarDate.split("-");
  const [calendarYear, setCalendarYear] = useState(Number(yearText));
  const [calendarMonth, setCalendarMonth] = useState(Number(monthText));

  useEffect(() => {
    if (!calendarOpen) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (event.target instanceof Node && !wrapperRef.current?.contains(event.target)) {
        setCalendarOpen(false);
      }
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [calendarOpen]);

  useEffect(() => {
    const parsedDate = parseDateInput(draft);
    const valid =
      draft === "" ||
      Boolean(
        parsedDate &&
          isDateWithinBounds(parsedDate, { min: minimumDate, max: maximumDate }),
      );
    inputRef.current?.setCustomValidity(
      valid
        ? ""
        : parsedDate
          ? "Date is outside the allowed range."
          : "Enter a valid date in DD-MM-YYYY format.",
    );
  }, [draft, maximumDate, minimumDate]);

  const calendarCells = useMemo(() => {
    const offset = weekday(calendarYear, calendarMonth, 1);
    const count = daysInMonth(calendarYear, calendarMonth);
    return Array.from({ length: Math.ceil((offset + count) / 7) * 7 }, (_, index) => {
      const day = index - offset + 1;
      return day > 0 && day <= count ? day : null;
    });
  }, [calendarMonth, calendarYear]);

  const updateValidity = (nextDraft: string) => {
    const parsedDate = parseDateInput(nextDraft);
    const valid =
      nextDraft === "" ||
      Boolean(
        parsedDate &&
          isDateWithinBounds(parsedDate, bounds),
      );
    if (inputRef.current) {
      inputRef.current.setCustomValidity(
        valid
          ? ""
          : parsedDate
            ? "Date is outside the allowed range."
            : "Enter a valid date in DD-MM-YYYY format.",
      );
    }
    onValidityChange?.(valid && (!required || nextDraft !== ""));
    return valid;
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextDraft = maskDateInput(event.target.value);
    if (nextDraft === null) {
      event.currentTarget.value = draft;
      return;
    }
    setDraft(nextDraft);
    if (updateValidity(nextDraft)) {
      onChange(nextDraft ? parseDateInput(nextDraft) || "" : "");
    }
  };

  const changeMonth = (delta: number) => {
    const next = new Date(0);
    next.setFullYear(calendarYear, calendarMonth - 1 + delta, 1);
    const nextMonth = `${String(next.getFullYear()).padStart(4, "0")}-${String(next.getMonth() + 1).padStart(2, "0")}`;
    const minimumMonth = bounds.min.slice(0, 7);
    const maximumMonth = bounds.max.slice(0, 7);
    if (nextMonth < minimumMonth || nextMonth > maximumMonth) return;
    setCalendarYear(next.getFullYear());
    setCalendarMonth(next.getMonth() + 1);
  };

  const calendarMonthKey = `${String(calendarYear).padStart(4, "0")}-${String(calendarMonth).padStart(2, "0")}`;
  const canGoPreviousMonth = calendarMonthKey > bounds.min.slice(0, 7);
  const canGoNextMonth = calendarMonthKey < bounds.max.slice(0, 7);

  const selectDay = (day: number) => {
    const selected = toIsoDate(calendarYear, calendarMonth, day);
    setDraft(formatDateForInput(selected));
    onChange(selected);
    updateValidity(formatDateForInput(selected));
    setCalendarOpen(false);
  };

  const selectedIso = selectedDate || isoValue;

  return (
    <div ref={wrapperRef} className="relative w-full">
      <input
        {...inputProps}
        ref={(element) => {
          inputRef.current = element;
          if (typeof forwardedRef === "function") forwardedRef(element);
          else if (forwardedRef) forwardedRef.current = element;
        }}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        maxLength={10}
        data-date-picker
        placeholder="DD-MM-YYYY"
        value={draft}
        required={required}
        disabled={disabled}
        min={undefined}
        max={undefined}
        aria-label={inputProps["aria-label"] || "Date (DD-MM-YYYY)"}
        aria-invalid={(draft !== "" && !selectedDate) || isOutsideRange}
        onChange={handleInputChange}
        onBlur={(event) => {
          updateValidity(draft);
          inputProps.onBlur?.(event);
        }}
        className={`${className} pr-10 ${draft && (!selectedDate || isOutsideRange) ? "border-rose-500" : ""}`}
      />
      <button
        type="button"
        aria-label="Open date picker"
        disabled={disabled}
        onClick={() => {
          setCalendarYear(Number(yearText));
          setCalendarMonth(Number(monthText));
          setCalendarOpen((open) => !open);
        }}
        className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-500 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <CalendarDays className="h-4 w-4" />
      </button>
      {calendarOpen ? (
        <div className="absolute right-0 z-50 mt-1 w-72 rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
          <div className="mb-3 flex items-center justify-between">
            <button type="button" aria-label="Previous month" disabled={!canGoPreviousMonth} onClick={() => changeMonth(-1)} className="rounded p-1 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium text-slate-800">
              {new Date(2000, calendarMonth - 1, 1).toLocaleString("en", { month: "long" })} {String(calendarYear).padStart(4, "0")}
            </span>
            <button type="button" aria-label="Next month" disabled={!canGoNextMonth} onClick={() => changeMonth(1)} className="rounded p-1 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="mb-1 grid grid-cols-7 text-center text-xs text-slate-500">
            {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((day) => <span key={day}>{day}</span>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {calendarCells.map((day, index) => {
              const date = day ? toIsoDate(calendarYear, calendarMonth, day) : "";
              const outsideRange = Boolean(date && !isDateWithinBounds(date, bounds));
              return day ? (
                <button
                  key={date}
                  type="button"
                  disabled={outsideRange}
                  onClick={() => selectDay(day)}
                  aria-pressed={date === selectedIso}
                  className={`h-8 rounded text-sm hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-30 ${date === selectedIso ? "bg-blue-600 text-white hover:bg-blue-700" : "text-slate-700"}`}
                >
                  {day}
                </button>
              ) : <span key={`empty-${index}`} />
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
});

export default DatePicker;
