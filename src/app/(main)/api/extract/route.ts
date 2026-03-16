import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { extractRateLimiter } from "@/lib/rate-limit";
import { validateFileType } from "@/lib/file-validation";

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

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limiting: 10 requests per minute per user
    const rateLimitResult = extractRateLimiter.check(user.userId);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: "Troppe richieste. Riprova tra qualche secondo." },
        {
          status: 429,
          headers: {
            "Retry-After": String(
              Math.ceil(rateLimitResult.retryAfterMs / 1000)
            ),
          },
        }
      );
    }

    // SEC-21: Validate Content-Type header
    const contentType = request.headers.get("content-type");
    if (!contentType?.includes("multipart/form-data")) {
      return NextResponse.json(
        { error: "Content-Type deve essere multipart/form-data." },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file || file.size === 0) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File troppo grande. Massimo 10MB consentiti." },
        { status: 413 }
      );
    }

    // SEC-19: Validate file type via magic bytes + extension
    const fileValidation = await validateFileType(file);
    if (!fileValidation.valid) {
      return NextResponse.json(
        { error: fileValidation.error },
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

    // Use media type detected from magic bytes (not client-supplied MIME)
    const mediaType = fileValidation.mediaType;

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
        console.error("Failed to parse AI response:", textBlock.text);
        return NextResponse.json(
          { error: "Risposta AI non valida. Riprova con un altro file." },
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
          userId: user.userId,
          deletedAt: null,
          vatNumber: {
            contains: normalizedVat,
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
    return NextResponse.json(
      { error: "Estrazione fallita. Riprova con un altro file." },
      { status: 500 }
    );
  }
}
