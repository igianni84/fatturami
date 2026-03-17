import { type VatRegime } from "@prisma/client";
import { getFiscalStrategy } from "@/lib/fiscal";

interface DisclaimerParams {
  companyCountry: string;
  vatRegime: VatRegime;
  hasValidVat: boolean;
}

/**
 * Generates the legal disclaimer for an invoice based on company country and client VAT regime.
 * Delegates to the country-specific FiscalStrategy.
 */
export function generateDisclaimer({ companyCountry, vatRegime, hasValidVat }: DisclaimerParams): string {
  const strategy = getFiscalStrategy(companyCountry);
  return strategy.generateDisclaimer(vatRegime, hasValidVat);
}
