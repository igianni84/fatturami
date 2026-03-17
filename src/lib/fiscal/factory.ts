import { type FiscalStrategy } from "./index";
import { ItalyFiscalStrategy } from "./italy";
import { SpainFiscalStrategy } from "./spain";

const strategies: Record<string, FiscalStrategy> = {
  IT: new ItalyFiscalStrategy(),
  ES: new SpainFiscalStrategy(),
};

/**
 * Returns the FiscalStrategy for the given country code.
 * Defaults to Spain (ES) if the country is not supported.
 */
export function getFiscalStrategy(country: string): FiscalStrategy {
  return strategies[country.toUpperCase()] ?? strategies.ES;
}
