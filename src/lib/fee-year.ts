export function getCurrentFeeYear(date = new Date()) {
  return date.getFullYear();
}

export function normalizeFeeYear(
  value: string | number | null | undefined,
  fallback = getCurrentFeeYear(),
) {
  const year = Number(value || fallback);
  return Number.isInteger(year) && year >= 2020 && year <= 2100
    ? year
    : fallback;
}
