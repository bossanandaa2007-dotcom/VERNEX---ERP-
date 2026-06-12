export const getTodayInputDate = () => {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 10);
};

export const shiftInputDate = (value: string, days: number) => {
  const base = new Date(`${value}T00:00:00`);
  base.setDate(base.getDate() + days);
  const localDate = new Date(base.getTime() - base.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 10);
};

export const getOldestEditableAttendanceDate = () => shiftInputDate(getTodayInputDate(), -2);

export const MIN_FILTER_DATE = '2000-01-01';

export const isStrictInputDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

export const isDateWithinInputRange = (
  value: string,
  options: { min?: string; max?: string } = {}
) => {
  if (!value) {
    return true;
  }

  if (!isStrictInputDate(value)) {
    return false;
  }

  if (options.min && value < options.min) {
    return false;
  }

  if (options.max && value > options.max) {
    return false;
  }

  return true;
};

export const getSafeFilterDateChangeHandler =
  (setValue: (value: string) => void, options: { min?: string; max?: string } = {}) =>
  (value: string) => {
    if (isDateWithinInputRange(value, options)) {
      setValue(value);
    }
  };

export const isFutureDateInput = (value: string) => {
  if (!value) {
    return false;
  }

  return value > getTodayInputDate();
};

export const isAttendanceDateFrozen = (value: string) => {
  if (!value) {
    return false;
  }

  return value < getOldestEditableAttendanceDate();
};

export const isAttendanceDateEditable = (value: string) => !isFutureDateInput(value) && !isAttendanceDateFrozen(value);
