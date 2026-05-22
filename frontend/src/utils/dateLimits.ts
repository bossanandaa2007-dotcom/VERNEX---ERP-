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
