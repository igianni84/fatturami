import { type FiscalStrategy, type IncomeTaxBracket, type TaxRegimeOption } from "./index";

/**
 * Spanish fiscal strategy — IRPF brackets, NIF/CIF validation,
 * and Spanish invoice disclaimers per Ley 37/1992.
 */
export class SpainFiscalStrategy implements FiscalStrategy {
  readonly country = "ES" as const;

  getIncomeTaxBrackets(): IncomeTaxBracket[] {
    return [
      { from: 0, to: 12450, rate: 19 },
      { from: 12450, to: 20200, rate: 24 },
      { from: 20200, to: 35200, rate: 30 },
      { from: 35200, to: 60000, rate: 37 },
      { from: 60000, to: null, rate: 45 },
    ];
  }

  getIncomeTaxLabel(): string {
    return "IRPF";
  }

  getVatReportLabel(): string {
    return "Modelo 303";
  }

  generateDisclaimer(vatRegime: string, hasValidVat: boolean): string {
    switch (vatRegime) {
      case "nazionale":
        return "Factura sujeta a IVA conforme al artículo 164 de la Ley 37/1992";
      case "intraUE":
        if (hasValidVat) {
          return "Operación exenta de IVA por aplicación del artículo 25 de la Ley 37/1992 (entrega intracomunitaria). Inversión del sujeto pasivo conforme al art. 196 Directiva 2006/112/CE";
        }
        return "Factura sujeta a IVA conforme al artículo 164 de la Ley 37/1992";
      case "extraUE":
        return "Operación no sujeta a IVA conforme al artículo 21 de la Ley 37/1992 (exportación)";
      default:
        return "Factura sujeta a IVA conforme al artículo 164 de la Ley 37/1992";
    }
  }

  validateTaxId(taxId: string): boolean {
    // NIF: 8 digits + letter (DNI) or letter + 7 digits + letter (NIE/CIF)
    return /^(\d{8}[A-Z]|[A-Z]\d{7}[A-Z0-9])$/i.test(taxId);
  }

  getTaxRegimes(): TaxRegimeOption[] {
    return [
      { value: "autonomo", label: "Autónomo" },
      { value: "sociedad", label: "Sociedad" },
      { value: "cooperativa", label: "Cooperativa" },
    ];
  }
}
