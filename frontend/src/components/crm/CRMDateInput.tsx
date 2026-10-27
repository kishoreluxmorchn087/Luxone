import {
  forwardRef,
  type ChangeEvent,
  type InputHTMLAttributes,
  useRef,
  useState,
} from "react";
import { CalendarDays } from "lucide-react";
import {
  formatCalendarDateInput,
  getDateBounds,
  isValidCalendarDateValue,
  type DateRangeRule,
} from "../../lib/shared/dateValidation";

type CRMDateInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "min" | "max"> & {
  dateRule?: DateRangeRule;
  min?: string;
  max?: string;
  type?: "date" | "datetime-local";
};

const CRMDateInput = forwardRef<HTMLInputElement, CRMDateInputProps>(function CRMDateInput(
  {
    dateRule = "start",
    type = "date",
    min: requestedMin,
    max: requestedMax,
    value,
    onChange,
    ...props
  },
  ref
) {
  const bounds = getDateBounds(dateRule);
  const ruleMin = type === "datetime-local" ? `${bounds.min}T00:00` : bounds.min;
  const ruleMax = type === "datetime-local" ? `${bounds.max}T23:59` : bounds.max;
  const min = requestedMin && requestedMin > ruleMin ? requestedMin : ruleMin;
  const max = requestedMax && requestedMax < ruleMax ? requestedMax : ruleMax;
  const datePickerRef = useRef<HTMLInputElement>(null);
  const isoDateValue = typeof value === "string" ? value.slice(0, 10) : "";
  const [typedDateState, setTypedDateState] = useState(() => ({
    isoValue: isoDateValue,
    displayValue: toDisplayDate(isoDateValue),
  }));
  if (typedDateState.isoValue !== isoDateValue) {
    setTypedDateState({
      isoValue: isoDateValue,
      displayValue: toDisplayDate(isoDateValue),
    });
  }

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const changedValue = event.currentTarget.value;
    if (
      changedValue &&
      (!isValidCalendarDateValue(changedValue.slice(0, 10), dateRule) ||
        changedValue < min ||
        changedValue > max)
    ) {
      event.currentTarget.value = typeof value === "string" ? value : "";
      return;
    }
    onChange?.(event);
  };

  const handleTypedDateChange = (event: ChangeEvent<HTMLInputElement>) => {
    const formattedValue = formatCalendarDateInput(
      event.currentTarget.value,
      "dd-mm-yyyy",
      dateRule
    );
    const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(formattedValue);
    const isoValue = match ? `${match[3]}-${match[2]}-${match[1]}` : "";
    setTypedDateState({ isoValue, displayValue: formattedValue });
    emitChangeWithValue(event, isoValue);
  };

  const handlePickerChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedDate = event.currentTarget.value;
    if (selectedDate && !isValidCalendarDateValue(selectedDate, dateRule)) {
      event.currentTarget.value = isoDateValue;
      return;
    }
    setTypedDateState({
      isoValue: selectedDate,
      displayValue: toDisplayDate(selectedDate),
    });
    const pickerInput = event.currentTarget;
    const originalName = pickerInput.name;
    pickerInput.name = props.name ?? "";
    try {
      onChange?.(event);
    } finally {
      pickerInput.name = originalName;
    }
  };

  const emitChangeWithValue = (
    event: ChangeEvent<HTMLInputElement>,
    newValue: string
  ) => {
    const input = event.currentTarget;
    const displayedValue = input.value;
    input.value = newValue;
    try {
      onChange?.(event);
    } finally {
      input.value = displayedValue;
    }
  };

  if (type === "date") {
    return (
      <div className="relative">
        <input
          {...props}
          ref={ref}
          type="text"
          value={typedDateState.displayValue}
          placeholder={props.placeholder || "dd-mm-yyyy"}
          inputMode="numeric"
          maxLength={10}
          autoComplete="off"
          className={props.className}
          style={{ ...props.style, paddingRight: "2.5rem" }}
          onChange={handleTypedDateChange}
        />
        <button
          type="button"
          aria-label="Open calendar"
          disabled={props.disabled}
          onClick={() => datePickerRef.current?.showPicker()}
          className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-slate-500 hover:text-slate-700 disabled:cursor-not-allowed"
        >
          <CalendarDays aria-hidden="true" size={16} />
        </button>
        <input
          ref={datePickerRef}
          type="date"
          value={isoDateValue}
          min={min}
          max={max}
          disabled={props.disabled}
          tabIndex={-1}
          aria-hidden="true"
          onChange={handlePickerChange}
          className="pointer-events-none absolute h-px w-px opacity-0"
        />
      </div>
    );
  }

  return (
    <input
      {...props}
      ref={ref}
      type={type}
      value={value}
      min={min}
      max={max}
      onChange={handleChange}
    />
  );
});

function toDisplayDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : "";
}

export default CRMDateInput;
