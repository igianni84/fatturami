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
  const creditNoteId = searchParams.get("id");
  const language = (searchParams.get("lang") || "ES") as PDFLanguage;

  if (!creditNoteId) {
    return NextResponse.json({ error: "Missing credit note ID" }, { status: 400 });
  }

  if (!["ES", "IT", "EN"].includes(language)) {
    return NextResponse.json({ error: "Invalid language" }, { status: 400 });
  }

  const [creditNote, company] = await Promise.all([
    prisma.creditNote.findUnique({
      where: { id: creditNoteId, userId: user.userId },
      include: {
        invoice: {
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
          },
        },
        lines: {
          include: { taxRate: { select: { name: true, rate: true } } },
        },
      },
    }),
    prisma.company.findUnique({ where: { userId: user.userId } }),
  ]);

  if (!creditNote) {
    return NextResponse.json({ error: "Credit note not found" }, { status: 404 });
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
    type: "creditNote",
    number: creditNote.number,
    date: creditNote.date.toISOString().split("T")[0],
    currency: creditNote.invoice.currency,
    referenceInvoice: creditNote.invoice.number,
    disclaimer: creditNote.invoice.disclaimer || undefined,
    notes: creditNote.notes || undefined,
    company: companyData,
    client: {
      name: creditNote.invoice.client.name,
      vatNumber: creditNote.invoice.client.vatNumber || "",
      address: creditNote.invoice.client.address || "",
      city: creditNote.invoice.client.city || "",
      postalCode: creditNote.invoice.client.postalCode || "",
      country: creditNote.invoice.client.country,
    },
    lines: creditNote.lines.map((line) => ({
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
      "Content-Disposition": `attachment; filename="${creditNote.number}.pdf"`,
    },
  });
}
