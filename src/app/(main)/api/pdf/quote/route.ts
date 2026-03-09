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
  const quoteId = searchParams.get("id");
  const language = (searchParams.get("lang") || "ES") as PDFLanguage;

  if (!quoteId) {
    return NextResponse.json({ error: "Missing quote ID" }, { status: 400 });
  }

  if (!["ES", "IT", "EN"].includes(language)) {
    return NextResponse.json({ error: "Invalid language" }, { status: 400 });
  }

  const [quote, company] = await Promise.all([
    prisma.quote.findUnique({
      where: { id: quoteId },
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

  if (!quote) {
    return NextResponse.json({ error: "Quote not found" }, { status: 404 });
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
    type: "quote",
    number: quote.number,
    date: quote.date.toISOString().split("T")[0],
    expiryDate: quote.expiryDate
      ? quote.expiryDate.toISOString().split("T")[0]
      : undefined,
    currency: "EUR",
    notes: quote.notes || undefined,
    company: companyData,
    client: {
      name: quote.client.name,
      vatNumber: quote.client.vatNumber || "",
      address: quote.client.address || "",
      city: quote.client.city || "",
      postalCode: quote.client.postalCode || "",
      country: quote.client.country,
    },
    lines: quote.lines.map((line) => ({
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
      "Content-Disposition": `attachment; filename="${quote.number}.pdf"`,
    },
  });
}
