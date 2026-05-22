export const formatCurrency = (amount: number | string) => {
  const numericAmount = typeof amount === 'number' ? amount : Number(amount);

  if (Number.isNaN(numericAmount)) {
    return `\u20B9${amount}`;
  }

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericAmount);
};
