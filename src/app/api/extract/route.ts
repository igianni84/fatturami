import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

export interface ExtractedLineItem {
  description: string;
  amount: number;
  taxRate: number;
}

export interface ExtractionResult {
  supplierName: string | null;
  supplierVatNumber: string | null;
  invoiceNumber: string | null;
  date: string | null;
  lineItems: ExtractedLineItem[];
  subtotal: number | null;
  taxAmount: number | null;
  total: number | null;
  matchedSupplierId: string | null;
  matchedSupplierName: string | null;
}

const EXTRACTION_PROMPT = `Analyze this invoice or receipt image and extract the following information in JSON format.
If a field cannot be determined, use null.

Return ONLY valid JSON with this exact structure (no markdown, no explanation):
{
  "supplierName": "Company name of the supplier/vendor",
  "supplierVatNumber": "VAT/Tax ID number of the supplier (e.g., ESB12345678, IT01234567890)",
  "invoiceNumber": "Invoice or receipt number",
  "date": "Date in YYYY-MM-DD format",
  "lineItems": [
    {
      "description": "Description of the item/service",
      "amount": 100.00,
      "taxRate": 21
    }
  ],
  "subtotal": 100.00,
  "taxAmount": 21.00,
  "total": 121.00
}

Important:
- All monetary values should be numbers (not strings)
- Tax rate should be a percentage number (e.g., 21 for 21%)
- Date must be in YYYY-MM-DD format
- If the document is not an invoice/receipt, return all null values
- Extract ALL line items visible in the document
- The VAT number should include the country prefix if visible (e.g., ES, IT, FR)`;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file || file.size === 0) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "File type not supported. Use PDF, JPG, PNG, WebP, or GIF." },
        { status: 400 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY not configured" },
        { status: 500 }
      );
    }

    const client = new Anthropic({ apiKey });

    // Read file as base64
    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");

    // Determine media type for the API
    let mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp" | "application/pdf";
    if (file.type === "application/pdf") {
      mediaType = "application/pdf";
    } else if (file.type === "image/png") {
      mediaType = "image/png";
    } else if (file.type === "image/gif") {
      mediaType = "image/gif";
    } else if (file.type === "image/webp") {
      mediaType = "image/webp";
    } else {
      mediaType = "image/jpeg";
    }

    // Call Claude API with vision
    const content: Anthropic.MessageCreateParams["messages"][0]["content"] = mediaType === "application/pdf"
      ? [
          {
            type: "document" as const,
            source: {
              type: "base64" as const,
              media_type: "application/pdf" as const,
              data: base64,
            },
          },
          {
            type: "text" as const,
            text: EXTRACTION_PROMPT,
          },
        ]
      : [
          {
            type: "image" as const,
            source: {
              type: "base64" as const,
              media_type: mediaType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
              data: base64,
            },
          },
          {
            type: "text" as const,
            text: EXTRACTION_PROMPT,
          },
        ];

    const message = await client.messages.create({
      model: "claude-3-5-sonnet-latest",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content,
        },
      ],
    });

    // Extract text response
    const textBlock = message.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json(
        { error: "No text response from AI" },
        { status: 500 }
      );
    }

    // Parse JSON response
    let extracted: Omit<ExtractionResult, "matchedSupplierId" | "matchedSupplierName">;
    try {
      extracted = JSON.parse(textBlock.text);
    } catch {
      // Try to extract JSON from potential markdown code block
      const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extracted = JSON.parse(jsonMatch[0]);
      } else {
        return NextResponse.json(
          { error: "Failed to parse AI response", rawResponse: textBlock.text },
          { status: 500 }
        );
      }
    }

    // Match supplier by VAT number
    let matchedSupplierId: string | null = null;
    let matchedSupplierName: string | null = null;

    if (extracted.supplierVatNumber) {
      const normalizedVat = extracted.supplierVatNumber.replace(/[\s.-]/g, "").toUpperCase();
      const supplier = await prisma.supplier.findFirst({
        where: {
          deletedAt: null,
          vatNumber: {
            contains: normalizedVat,
            mode: "insensitive",
          },
        },
        select: { id: true, name: true },
      });

      if (supplier) {
        matchedSupplierId = supplier.id;
        matchedSupplierName = supplier.name;
      }
    }

    const result: ExtractionResult = {
      supplierName: extracted.supplierName || null,
      supplierVatNumber: extracted.supplierVatNumber || null,
      invoiceNumber: extracted.invoiceNumber || null,
      date: extracted.date || null,
      lineItems: Array.isArray(extracted.lineItems) ? extracted.lineItems : [],
      subtotal: extracted.subtotal ?? null,
      taxAmount: extracted.taxAmount ?? null,
      total: extracted.total ?? null,
      matchedSupplierId,
      matchedSupplierName,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Extraction error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Extraction failed: ${message}` },
      { status: 500 }
    );
  }
}
