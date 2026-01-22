import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import { PDFLanguage, getTranslations } from "./translations";

// --- Types ---

export interface PDFCompanyData {
  name: string;
  nif: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  email: string;
  phone: string;
  iban: string;
}

export interface PDFClientData {
  name: string;
  vatNumber: string;
  address: string;
  city?: string;
  postalCode?: string;
  country: string;
}

export interface PDFLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  taxRateName: string;
}

export interface PDFInvoiceData {
  type: "invoice" | "quote" | "creditNote";
  number: string;
  date: string;
  dueDate?: string;
  expiryDate?: string;
  currency: string;
  exchangeRate?: number;
  disclaimer?: string;
  notes?: string;
  referenceInvoice?: string;
  company: PDFCompanyData;
  client: PDFClientData;
  lines: PDFLineItem[];
}

// --- Styles ---

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#333333",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
  },
  logoPlaceholder: {
    width: 80,
    height: 80,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 4,
  },
  logoText: {
    fontSize: 8,
    color: "#999999",
  },
  titleSection: {
    alignItems: "flex-end",
  },
  title: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  documentNumber: {
    fontSize: 11,
    color: "#666666",
  },
  partiesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  partyBox: {
    width: "48%",
  },
  partyLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#888888",
    textTransform: "uppercase",
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  partyName: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    marginBottom: 3,
  },
  partyDetail: {
    fontSize: 9,
    color: "#555555",
    marginBottom: 2,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "flex-start",
    marginBottom: 20,
    gap: 30,
  },
  metaItem: {
    minWidth: 80,
  },
  metaLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#888888",
    textTransform: "uppercase",
    marginBottom: 3,
  },
  metaValue: {
    fontSize: 10,
    color: "#333333",
  },
  table: {
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f5f5f5",
    borderBottomWidth: 1,
    borderBottomColor: "#dddddd",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#eeeeee",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  colDescription: {
    flex: 3,
  },
  colQuantity: {
    flex: 1,
    textAlign: "right",
  },
  colUnitPrice: {
    flex: 1.5,
    textAlign: "right",
  },
  colTax: {
    flex: 1,
    textAlign: "right",
  },
  colTotal: {
    flex: 1.5,
    textAlign: "right",
  },
  headerText: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#666666",
    textTransform: "uppercase",
  },
  cellText: {
    fontSize: 9,
    color: "#333333",
  },
  totalsSection: {
    alignItems: "flex-end",
    marginBottom: 20,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    width: 200,
    paddingVertical: 3,
  },
  totalLabel: {
    fontSize: 9,
    color: "#666666",
    width: 100,
    textAlign: "right",
    paddingRight: 10,
  },
  totalValue: {
    fontSize: 9,
    color: "#333333",
    width: 100,
    textAlign: "right",
  },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    width: 200,
    paddingVertical: 5,
    borderTopWidth: 1,
    borderTopColor: "#333333",
    marginTop: 3,
  },
  grandTotalLabel: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#1a1a1a",
    width: 100,
    textAlign: "right",
    paddingRight: 10,
  },
  grandTotalValue: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#1a1a1a",
    width: 100,
    textAlign: "right",
  },
  disclaimerBox: {
    backgroundColor: "#fffbeb",
    borderWidth: 1,
    borderColor: "#fbbf24",
    borderRadius: 4,
    padding: 10,
    marginBottom: 16,
  },
  disclaimerLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#92400e",
    marginBottom: 4,
  },
  disclaimerText: {
    fontSize: 8,
    color: "#78350f",
  },
  bankBox: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 4,
    padding: 10,
    marginBottom: 16,
  },
  bankLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#475569",
    marginBottom: 4,
  },
  bankValue: {
    fontSize: 10,
    color: "#1e293b",
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.5,
  },
  notesBox: {
    marginBottom: 16,
  },
  notesLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#888888",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  notesText: {
    fontSize: 9,
    color: "#555555",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 7,
    color: "#999999",
  },
});

// --- Helpers ---

function formatCurrency(amount: number, currency: string): string {
  const symbol = currency === "EUR" ? "\u20ac" : currency === "GBP" ? "\u00a3" : "$";
  return `${symbol} ${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// --- Component ---

export function InvoicePDF({
  data,
  language = "ES",
}: {
  data: PDFInvoiceData;
  language?: PDFLanguage;
}) {
  const t = getTranslations(language);

  const titleMap = {
    invoice: t.invoice,
    quote: t.quote,
    creditNote: t.creditNote,
  };

  const subtotal = data.lines.reduce(
    (sum, line) => sum + line.quantity * line.unitPrice,
    0
  );
  const taxTotal = data.lines.reduce((sum, line) => {
    const lineSubtotal = line.quantity * line.unitPrice;
    return sum + lineSubtotal * (line.taxRate / 100);
  }, 0);
  const total = subtotal + taxTotal;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoPlaceholder}>
            <Text style={styles.logoText}>LOGO</Text>
          </View>
          <View style={styles.titleSection}>
            <Text style={styles.title}>{titleMap[data.type]}</Text>
            <Text style={styles.documentNumber}>{data.number}</Text>
          </View>
        </View>

        {/* From / To */}
        <View style={styles.partiesRow}>
          <View style={styles.partyBox}>
            <Text style={styles.partyLabel}>{t.from}</Text>
            <Text style={styles.partyName}>{data.company.name}</Text>
            <Text style={styles.partyDetail}>
              {t.nif}: {data.company.nif}
            </Text>
            <Text style={styles.partyDetail}>{data.company.address}</Text>
            <Text style={styles.partyDetail}>
              {data.company.postalCode} {data.company.city}, {data.company.country}
            </Text>
            {data.company.email && (
              <Text style={styles.partyDetail}>{data.company.email}</Text>
            )}
            {data.company.phone && (
              <Text style={styles.partyDetail}>{data.company.phone}</Text>
            )}
          </View>
          <View style={styles.partyBox}>
            <Text style={styles.partyLabel}>{t.to}</Text>
            <Text style={styles.partyName}>{data.client.name}</Text>
            {data.client.vatNumber && (
              <Text style={styles.partyDetail}>
                {t.vatNumber}: {data.client.vatNumber}
              </Text>
            )}
            {data.client.address && (
              <Text style={styles.partyDetail}>{data.client.address}</Text>
            )}
            {(data.client.postalCode || data.client.city) && (
              <Text style={styles.partyDetail}>
                {data.client.postalCode} {data.client.city}
              </Text>
            )}
            <Text style={styles.partyDetail}>{data.client.country}</Text>
          </View>
        </View>

        {/* Document meta info */}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>{t.date}</Text>
            <Text style={styles.metaValue}>{data.date}</Text>
          </View>
          {data.dueDate && (
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>{t.dueDate}</Text>
              <Text style={styles.metaValue}>{data.dueDate}</Text>
            </View>
          )}
          {data.expiryDate && (
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>{t.expiryDate}</Text>
              <Text style={styles.metaValue}>{data.expiryDate}</Text>
            </View>
          )}
          {data.currency !== "EUR" && data.exchangeRate && (
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>{t.exchangeRate}</Text>
              <Text style={styles.metaValue}>
                1 {data.currency} = {data.exchangeRate} EUR
              </Text>
            </View>
          )}
          {data.referenceInvoice && (
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>{t.creditNoteRef}</Text>
              <Text style={styles.metaValue}>{data.referenceInvoice}</Text>
            </View>
          )}
        </View>

        {/* Line items table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.headerText, styles.colDescription]}>{t.description}</Text>
            <Text style={[styles.headerText, styles.colQuantity]}>{t.quantity}</Text>
            <Text style={[styles.headerText, styles.colUnitPrice]}>{t.unitPrice}</Text>
            <Text style={[styles.headerText, styles.colTax]}>{t.tax}</Text>
            <Text style={[styles.headerText, styles.colTotal]}>{t.lineTotal}</Text>
          </View>
          {data.lines.map((line, index) => {
            const lineSubtotal = line.quantity * line.unitPrice;
            const lineTax = lineSubtotal * (line.taxRate / 100);
            const lineTotal = lineSubtotal + lineTax;
            return (
              <View style={styles.tableRow} key={index}>
                <Text style={[styles.cellText, styles.colDescription]}>
                  {line.description}
                </Text>
                <Text style={[styles.cellText, styles.colQuantity]}>
                  {line.quantity}
                </Text>
                <Text style={[styles.cellText, styles.colUnitPrice]}>
                  {formatCurrency(line.unitPrice, data.currency)}
                </Text>
                <Text style={[styles.cellText, styles.colTax]}>
                  {line.taxRate}%
                </Text>
                <Text style={[styles.cellText, styles.colTotal]}>
                  {formatCurrency(lineTotal, data.currency)}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>{t.subtotal}:</Text>
            <Text style={styles.totalValue}>
              {formatCurrency(subtotal, data.currency)}
            </Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>{t.taxTotal}:</Text>
            <Text style={styles.totalValue}>
              {formatCurrency(taxTotal, data.currency)}
            </Text>
          </View>
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>{t.total}:</Text>
            <Text style={styles.grandTotalValue}>
              {formatCurrency(total, data.currency)}
            </Text>
          </View>
        </View>

        {/* Disclaimer */}
        {data.disclaimer && (
          <View style={styles.disclaimerBox}>
            <Text style={styles.disclaimerLabel}>{t.legalDisclaimer}</Text>
            <Text style={styles.disclaimerText}>{data.disclaimer}</Text>
          </View>
        )}

        {/* Bank details */}
        {data.company.iban && (
          <View style={styles.bankBox}>
            <Text style={styles.bankLabel}>{t.bankDetails}</Text>
            <Text style={styles.bankValue}>
              {t.iban}: {data.company.iban}
            </Text>
          </View>
        )}

        {/* Notes */}
        {data.notes && (
          <View style={styles.notesBox}>
            <Text style={styles.notesLabel}>{t.notes}</Text>
            <Text style={styles.notesText}>{data.notes}</Text>
          </View>
        )}

        {/* Footer */}
        <Text style={styles.footer}>
          {data.company.name} - {t.nif}: {data.company.nif} - {data.company.email}
        </Text>
      </Page>
    </Document>
  );
}
