import { type FiscalStrategy, type IncomeTaxBracket, type TaxRegimeOption } from "./index";

/**
 * Italian fiscal strategy — IRPEF 2024 brackets, Partita IVA validation,
 * and Italian invoice disclaimers per DPR 633/72 and DL 331/93.
 */
export class ItalyFiscalStrategy implements FiscalStrategy {
  readonly country = "IT" as const;

  getIncomeTaxBrackets(): IncomeTaxBracket[] {
    return [
      { from: 0, to: 28000, rate: 23 },
      { from: 28000, to: 50000, rate: 25 },
      { from: 50000, to: 100000, rate: 35 },
      { from: 100000, to: null, rate: 43 },
    ];
  }

  getIncomeTaxLabel(): string {
    return "IRPEF";
  }

  getVatReportLabel(): string {
    return "Liquidazione IVA";
  }

  generateDisclaimer(vatRegime: string, hasValidVat: boolean): string {
    switch (vatRegime) {
      case "nazionale":
        return "Operazione soggetta a IVA ai sensi del DPR 633/72";
      case "intraUE":
        if (hasValidVat) {
          return "Operazione non imponibile ai sensi dell'art. 41 DL 331/93 (cessione intracomunitaria). Inversione contabile ai sensi dell'art. 196 Direttiva 2006/112/CE";
        }
        return "Operazione soggetta a IVA ai sensi del DPR 633/72";
      case "extraUE":
        return "Operazione non imponibile ai sensi dell'art. 8 DPR 633/72 (esportazione)";
      default:
        return "Operazione soggetta a IVA ai sensi del DPR 633/72";
    }
  }

  validateTaxId(taxId: string): boolean {
    // Partita IVA: optional "IT" prefix + 11 digits
    return /^(IT)?\d{11}$/i.test(taxId);
  }

  getTaxRegimes(): TaxRegimeOption[] {
    return [
      { value: "forfettario", label: "Forfettario" },
      { value: "ordinario", label: "Ordinario" },
      { value: "semplificato", label: "Semplificato" },
    ];
  }
}
