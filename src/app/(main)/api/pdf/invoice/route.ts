import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { InvoicePDF, PDFInvoiceData } from "@/lib/pdf/InvoicePDF";
import { PDFLanguage } from "@/lib/pdf/translations";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const invoiceId = searchParams.get("id");
  const language = (searchParams.get("lang") || "ES") as PDFLanguage;

  if (!invoiceId) {
    return NextResponse.json({ error: "Missing invoice ID" }, { status: 400 });
  }

  if (!["ES", "IT", "EN"].includes(language)) {
    return NextResponse.json({ error: "Invalid language" }, { status: 400 });
  }

  // Fetch invoice and company data in parallel
  const [invoice, company] = await Promise.all([
    prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        client: {
          select: {
            name: true,
            vatNumber: true,
            address: true,
            city: true,
            postalCode: true,
            country: true,
          },
        },
        lines: {
          include: { taxRate: { select: { name: true, rate: true } } },
        },
      },
    }),
    prisma.company.findFirst(),
  ]);

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  const companyData = company
    ? {
        name: company.name,
        nif: company.nif,
        address: company.address,
        city: company.city,
        postalCode: company.postalCode,
        country: company.country,
        email: company.email,
        phone: company.phone,
        iban: company.iban,
      }
    : {
        name: "",
        nif: "",
        address: "",
        city: "",
        postalCode: "",
        country: "",
        email: "",
        phone: "",
        iban: "",
      };

  const pdfData: PDFInvoiceData = {
    type: "invoice",
    number: invoice.number,
    date: invoice.date.toISOString().split("T")[0],
    dueDate: invoice.dueDate
      ? invoice.dueDate.toISOString().split("T")[0]
      : undefined,
    paidAt: invoice.paidAt
      ? invoice.paidAt.toISOString().split("T")[0]
      : undefined,
    currency: invoice.currency,
    exchangeRate:
      invoice.currency !== "EUR" ? Number(invoice.exchangeRate) : undefined,
    disclaimer: invoice.disclaimer || undefined,
    notes: invoice.notes || undefined,
    company: companyData,
    client: {
      name: invoice.client.name,
      vatNumber: invoice.client.vatNumber || "",
      address: invoice.client.address || "",
      city: invoice.client.city || "",
      postalCode: invoice.client.postalCode || "",
      country: invoice.client.country,
    },
    lines: invoice.lines.map((line) => ({
      description: line.description,
      quantity: Number(line.quantity),
      unitPrice: Number(line.unitPrice),
      taxRate: Number(line.taxRate.rate),
      taxRateName: line.taxRate.name,
    })),
  };

  const buffer = await renderToBuffer(
    React.createElement(InvoicePDF, { data: pdfData, language })
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${invoice.number}.pdf"`,
    },
  });
}
