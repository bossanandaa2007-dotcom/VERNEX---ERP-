export const getTodayInputDate = () => {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 10);
};

export const isFutureDateInput = (value: string) => {
  if (!value) {
    return false;
  }

  return value > getTodayInputDate();
};
