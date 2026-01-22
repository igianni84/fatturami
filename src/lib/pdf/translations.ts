export type PDFLanguage = "ES" | "IT" | "EN";

export interface PDFTranslations {
  invoice: string;
  quote: string;
  creditNote: string;
  invoiceNumber: string;
  date: string;
  dueDate: string;
  from: string;
  to: string;
  vatNumber: string;
  nif: string;
  address: string;
  description: string;
  quantity: string;
  unitPrice: string;
  tax: string;
  lineTotal: string;
  subtotal: string;
  taxTotal: string;
  total: string;
  legalDisclaimer: string;
  bankDetails: string;
  iban: string;
  notes: string;
  currency: string;
  exchangeRate: string;
  page: string;
  of: string;
  creditNoteRef: string;
  expiryDate: string;
}

const translations: Record<PDFLanguage, PDFTranslations> = {
  ES: {
    invoice: "Factura",
    quote: "Presupuesto",
    creditNote: "Nota de Cr\u00e9dito",
    invoiceNumber: "N\u00famero",
    date: "Fecha",
    dueDate: "Vencimiento",
    from: "De",
    to: "Para",
    vatNumber: "NIF/CIF",
    nif: "NIF/CIF",
    address: "Direcci\u00f3n",
    description: "Descripci\u00f3n",
    quantity: "Cantidad",
    unitPrice: "Precio Unit.",
    tax: "IVA",
    lineTotal: "Total",
    subtotal: "Base Imponible",
    taxTotal: "IVA",
    total: "Total",
    legalDisclaimer: "Aviso Legal",
    bankDetails: "Datos Bancarios",
    iban: "IBAN",
    notes: "Notas",
    currency: "Moneda",
    exchangeRate: "Tipo de Cambio",
    page: "P\u00e1gina",
    of: "de",
    creditNoteRef: "Factura de referencia",
    expiryDate: "Fecha de validez",
  },
  IT: {
    invoice: "Fattura",
    quote: "Preventivo",
    creditNote: "Nota di Credito",
    invoiceNumber: "Numero",
    date: "Data",
    dueDate: "Scadenza",
    from: "Da",
    to: "A",
    vatNumber: "P.IVA/VAT",
    nif: "NIF/CIF",
    address: "Indirizzo",
    description: "Descrizione",
    quantity: "Quantit\u00e0",
    unitPrice: "Prezzo Unit.",
    tax: "IVA",
    lineTotal: "Totale",
    subtotal: "Imponibile",
    taxTotal: "IVA",
    total: "Totale",
    legalDisclaimer: "Avvertenze Legali",
    bankDetails: "Coordinate Bancarie",
    iban: "IBAN",
    notes: "Note",
    currency: "Valuta",
    exchangeRate: "Tasso di Cambio",
    page: "Pagina",
    of: "di",
    creditNoteRef: "Fattura di riferimento",
    expiryDate: "Data di validit\u00e0",
  },
  EN: {
    invoice: "Invoice",
    quote: "Quote",
    creditNote: "Credit Note",
    invoiceNumber: "Number",
    date: "Date",
    dueDate: "Due Date",
    from: "From",
    to: "To",
    vatNumber: "VAT Number",
    nif: "Tax ID",
    address: "Address",
    description: "Description",
    quantity: "Qty",
    unitPrice: "Unit Price",
    tax: "VAT",
    lineTotal: "Total",
    subtotal: "Subtotal",
    taxTotal: "VAT",
    total: "Total",
    legalDisclaimer: "Legal Disclaimer",
    bankDetails: "Bank Details",
    iban: "IBAN",
    notes: "Notes",
    currency: "Currency",
    exchangeRate: "Exchange Rate",
    page: "Page",
    of: "of",
    creditNoteRef: "Reference Invoice",
    expiryDate: "Valid Until",
  },
};

export function getTranslations(lang: PDFLanguage): PDFTranslations {
  return translations[lang];
}
