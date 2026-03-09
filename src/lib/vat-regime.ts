/**
 * Shared VAT regime detection utility.
 * Works both server-side and client-side (no Prisma dependency).
 */

export const EU_COUNTRIES = [
  { code: "AT", name: "Austria" },
  { code: "BE", name: "Belgio" },
  { code: "BG", name: "Bulgaria" },
  { code: "HR", name: "Croazia" },
  { code: "CY", name: "Cipro" },
  { code: "CZ", name: "Repubblica Ceca" },
  { code: "DK", name: "Danimarca" },
  { code: "EE", name: "Estonia" },
  { code: "FI", name: "Finlandia" },
  { code: "FR", name: "Francia" },
  { code: "DE", name: "Germania" },
  { code: "GR", name: "Grecia" },
  { code: "HU", name: "Ungheria" },
  { code: "IE", name: "Irlanda" },
  { code: "IT", name: "Italia" },
  { code: "LV", name: "Lettonia" },
  { code: "LT", name: "Lituania" },
  { code: "LU", name: "Lussemburgo" },
  { code: "MT", name: "Malta" },
  { code: "NL", name: "Paesi Bassi" },
  { code: "PL", name: "Polonia" },
  { code: "PT", name: "Portogallo" },
  { code: "RO", name: "Romania" },
  { code: "SK", name: "Slovacchia" },
  { code: "SI", name: "Slovenia" },
  { code: "ES", name: "Spagna" },
  { code: "SE", name: "Svezia" },
] as const;

export const EXTRA_EU_COUNTRIES = [
  { code: "GB", name: "Regno Unito" },
  { code: "US", name: "Stati Uniti" },
  { code: "CH", name: "Svizzera" },
  { code: "NO", name: "Norvegia" },
  { code: "JP", name: "Giappone" },
  { code: "CN", name: "Cina" },
  { code: "AU", name: "Australia" },
  { code: "CA", name: "Canada" },
  { code: "BR", name: "Brasile" },
  { code: "MX", name: "Messico" },
] as const;

export const EU_COUNTRY_CODES: string[] = EU_COUNTRIES.map((c) => c.code);

const COUNTRY_NAME_MAP: Record<string, string> = {
  ESPAÑA: "ES",
  SPAIN: "ES",
  SPAGNA: "ES",
  ITALIA: "IT",
  ITALY: "IT",
  FRANCIA: "FR",
  FRANCE: "FR",
  GERMANIA: "DE",
  GERMANY: "DE",
  MALTA: "MT",
};

/**
 * Normalizes a country input to its ISO 3166-1 alpha-2 code.
 * Handles both ISO codes and common name variants.
 */
export function normalizeCountryCode(country: string): string {
  const upper = country.toUpperCase().trim();
  return COUNTRY_NAME_MAP[upper] ?? upper;
}

export type VatRegimeValue = "nazionale" | "intraUE" | "extraUE";

/**
 * Detects the VAT regime for a client based on their country
 * relative to the company's home country.
 */
export function detectVatRegime(
  clientCountry: string,
  companyCountry: string
): VatRegimeValue {
  const clientCode = normalizeCountryCode(clientCountry);
  const companyCode = companyCountry.toUpperCase().trim();

  if (clientCode === companyCode) return "nazionale";
  if (EU_COUNTRY_CODES.includes(clientCode)) return "intraUE";
  return "extraUE";
}
