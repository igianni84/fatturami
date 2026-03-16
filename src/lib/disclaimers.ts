import { type VatRegime } from "@prisma/client";

interface DisclaimerParams {
  companyCountry: string;
  vatRegime: VatRegime;
  hasValidVat: boolean;
}

/**
 * Generates the legal disclaimer for an invoice based on company country and client VAT regime.
 */
export function generateDisclaimer({ companyCountry, vatRegime, hasValidVat }: DisclaimerParams): string {
  if (companyCountry === "IT") {
    return generateItalianDisclaimer(vatRegime, hasValidVat);
  }
  return generateSpanishDisclaimer(vatRegime, hasValidVat);
}

function generateSpanishDisclaimer(vatRegime: VatRegime, hasValidVat: boolean): string {
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

function generateItalianDisclaimer(vatRegime: VatRegime, hasValidVat: boolean): string {
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
