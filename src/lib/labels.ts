/**
 * Shared label dictionaries for status enums, categories, and VAT regimes.
 * Single source of truth for Italian UI labels across the application.
 */

export const invoiceStatusLabels: Record<string, string> = {
  bozza: "Bozza",
  emessa: "Emessa",
  inviata: "Inviata",
  parzialmente_pagata: "Parzialmente pagata",
  pagata: "Pagata",
  scaduta: "Scaduta",
};

export const quoteStatusLabels: Record<string, string> = {
  bozza: "Bozza",
  inviato: "Inviato",
  accettato: "Accettato",
  rifiutato: "Rifiutato",
  scaduto: "Scaduto",
  convertito: "Convertito",
};

export const purchaseInvoiceStatusLabels: Record<string, string> = {
  registrata: "Registrata",
  pagata: "Pagata",
};

export const expenseCategoryLabels: Record<string, string> = {
  servizi_professionali: "Servizi professionali",
  software: "Software",
  hardware: "Hardware",
  viaggi: "Viaggi",
  telecomunicazioni: "Telecomunicazioni",
  trasporti: "Trasporti",
  pasti: "Pasti",
  materiale_ufficio: "Materiale ufficio",
  altro: "Altro",
};

export const vatRegimeLabels: Record<string, string> = {
  nazionale: "Nazionale",
  intraUE: "Intra-UE",
  extraUE: "Extra-UE",
};
