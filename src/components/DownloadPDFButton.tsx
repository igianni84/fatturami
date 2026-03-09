"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, ChevronDown } from "lucide-react";
import { toast } from "sonner";

interface DownloadPDFButtonProps {
  documentId: string;
  documentType: "invoice" | "quote" | "credit-note";
  defaultFilename?: string;
}

const languages = [
  { code: "ES", label: "Spagnolo" },
  { code: "IT", label: "Italiano" },
  { code: "EN", label: "Inglese" },
];

export function DownloadPDFButton({
  documentId,
  documentType,
  defaultFilename = "document.pdf",
}: DownloadPDFButtonProps) {
  const [downloading, setDownloading] = useState(false);

  async function handleDownload(language: string) {
    setDownloading(true);
    try {
      const res = await fetch(
        `/api/pdf/${documentType}?id=${documentId}&lang=${language}`
      );
      if (!res.ok) {
        toast.error("Errore nella generazione del PDF");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        res.headers.get("Content-Disposition")?.split("filename=")[1]?.replace(/"/g, "") ||
        defaultFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={downloading} className="gap-2">
          <Download className="size-4" />
          {downloading ? "Generando..." : "Scarica PDF"}
          <ChevronDown className="size-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => handleDownload(lang.code)}
          >
            {lang.code} — {lang.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
