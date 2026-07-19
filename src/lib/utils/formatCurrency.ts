export function formatINR(amount: number): string {
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);

  const [intPart, decimalPart] = absAmount.toFixed(2).split(".");

  const hasDecimals = decimalPart !== "00";

  const intFormatted = intPart.replace(/\B(?=(\d{2})+(?!\d))/g, ",");

  let result = `₹${intFormatted}`;

  if (hasDecimals) {
    result += `.${decimalPart}`;
  }

  if (isNegative) {
    result = `-${result}`;
  }

  return result;
}
