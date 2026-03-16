/**
 * Shared currency and amount formatting utilities.
 */

const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: "€",
  GBP: "£",
  USD: "$",
};

/**
 * Format amount with currency symbol (e.g. "€ 1.234,56").
 * Used in list pages, detail pages, and anywhere a full currency display is needed.
 */
export function formatCurrency(amount: number, currency: string = "EUR"): string {
  const symbol = CURRENCY_SYMBOLS[currency] || currency;
  return `${symbol} ${amount.toLocaleString("it-IT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Format amount without currency symbol (e.g. "1.234,56").
 * Used in form subtotals and inline calculations.
 */
export function formatAmount(amount: number): string {
  return amount.toLocaleString("it-IT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Format amount for Spanish fiscal reports (e.g. "1.234,56 €").
 * Uses Intl.NumberFormat with es-ES locale for Modelo 303/IRPF compliance.
 */
export function formatCurrencyES(amount: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
