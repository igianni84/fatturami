/**
 * VIES VAT Number Validation Service
 * Uses the European Commission's VIES SOAP/REST API to validate EU VAT numbers.
 */

export interface ViesValidationResult {
  valid: boolean | null; // null means service unavailable
  name?: string;
  address?: string;
  error?: string;
}

// Escape XML special characters to prevent injection
function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// EU country codes that can be validated via VIES
const VIES_COUNTRIES = [
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR",
  "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL",
  "PL", "PT", "RO", "SK", "SI", "ES", "SE",
];

// Greece uses EL as VAT prefix instead of GR
function getViesCountryCode(country: string): string {
  return country.toUpperCase() === "GR" ? "EL" : country.toUpperCase();
}

/**
 * Validates an EU VAT number against the VIES system.
 * Returns { valid: true/false } on success, or { valid: null, error } if service is unavailable.
 */
export async function validateVatVies(
  vatNumber: string,
  country: string
): Promise<ViesValidationResult> {
  const countryCode = country.toUpperCase().trim();

  // Only validate EU countries
  if (!VIES_COUNTRIES.includes(countryCode)) {
    return { valid: null, error: "Paese non UE, validazione VIES non applicabile" };
  }

  if (!vatNumber || vatNumber.trim() === "") {
    return { valid: null, error: "Partita IVA non fornita" };
  }

  // Strip the country prefix if the user included it (e.g., "IT12345678901" -> "12345678901")
  let cleanVat = vatNumber.trim().replace(/[\s.-]/g, "");
  const viesCountry = getViesCountryCode(countryCode);
  if (cleanVat.toUpperCase().startsWith(viesCountry)) {
    cleanVat = cleanVat.substring(viesCountry.length);
  }
  // Also handle when user uses the ISO code for Greece (GR vs EL)
  if (countryCode === "GR" && cleanVat.toUpperCase().startsWith("GR")) {
    cleanVat = cleanVat.substring(2);
  }

  try {
    // Use the VIES SOAP API via a POST request
    const soapBody = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:urn="urn:ec.europa.eu:taxud:vies:services:checkVat:types">
  <soapenv:Body>
    <urn:checkVat>
      <urn:countryCode>${escapeXml(viesCountry)}</urn:countryCode>
      <urn:vatNumber>${escapeXml(cleanVat)}</urn:vatNumber>
    </urn:checkVat>
  </soapenv:Body>
</soapenv:Envelope>`;

    const response = await fetch(
      "https://ec.europa.eu/taxation_customs/vies/services/checkVatService",
      {
        method: "POST",
        headers: {
          "Content-Type": "text/xml;charset=UTF-8",
          SOAPAction: "",
        },
        body: soapBody,
        signal: AbortSignal.timeout(10000), // 10 second timeout
      }
    );

    if (!response.ok) {
      return { valid: null, error: `Servizio VIES non disponibile (HTTP ${response.status})` };
    }

    const xml = await response.text();

    // Parse the SOAP response for the valid field
    const validMatch = xml.match(/<valid>(true|false)<\/valid>/i);
    if (!validMatch) {
      // Check for SOAP fault
      const faultMatch = xml.match(/<faultstring>([^<]+)<\/faultstring>/);
      if (faultMatch) {
        return { valid: null, error: `Errore VIES: ${faultMatch[1]}` };
      }
      return { valid: null, error: "Risposta VIES non valida" };
    }

    const isValid = validMatch[1].toLowerCase() === "true";

    // Extract name and address if available
    const nameMatch = xml.match(/<name>([^<]*)<\/name>/);
    const addressMatch = xml.match(/<address>([^<]*)<\/address>/);

    return {
      valid: isValid,
      name: nameMatch?.[1]?.trim() || undefined,
      address: addressMatch?.[1]?.trim() || undefined,
    };
  } catch (error) {
    // Network errors, timeouts, etc.
    const message = error instanceof Error ? error.message : "Errore sconosciuto";
    return { valid: null, error: `Servizio VIES non raggiungibile: ${message}` };
  }
}

/**
 * Checks if a country code is an EU country eligible for VIES validation.
 */
export function isViesEligible(country: string): boolean {
  return VIES_COUNTRIES.includes(country.toUpperCase().trim());
}
