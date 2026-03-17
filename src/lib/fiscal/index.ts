/**
 * Fiscal Strategy Pattern — centralizes country-specific fiscal logic.
 *
 * Each supported country implements FiscalStrategy, providing income tax brackets,
 * labels, disclaimer generation, tax ID validation, and available tax regimes.
 */

export interface IncomeTaxBracket {
  from: number;
  to: number | null;
  rate: number;
}

export interface TaxRegimeOption {
  value: string;
  label: string;
}

export interface FiscalStrategy {
  country: "IT" | "ES";
  getIncomeTaxBrackets(): IncomeTaxBracket[];
  getIncomeTaxLabel(): string;
  getVatReportLabel(): string;
  generateDisclaimer(vatRegime: string, hasValidVat: boolean): string;
  validateTaxId(taxId: string): boolean;
  getTaxRegimes(): TaxRegimeOption[];
}

export { getFiscalStrategy } from "./factory";
