"use client";

import { DownloadPDFButton as SharedDownloadPDFButton } from "@/components/DownloadPDFButton";

export function DownloadPDFButton({ invoiceId }: { invoiceId: string }) {
  return (
    <SharedDownloadPDFButton
      documentId={invoiceId}
      documentType="invoice"
      defaultFilename="invoice.pdf"
    />
  );
}
