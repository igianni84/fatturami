"use client";

import { useState } from "react";

export function DownloadPDFButton({ invoiceId }: { invoiceId: string }) {
  const [language, setLanguage] = useState("ES");
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    setDownloading(true);
    try {
      const res = await fetch(
        `/api/pdf/invoice?id=${invoiceId}&lang=${language}`
      );
      if (!res.ok) {
        alert("Errore nella generazione del PDF");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        res.headers.get("Content-Disposition")?.split("filename=")[1]?.replace(/"/g, "") ||
        "invoice.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value)}
        className="px-2 py-2 border border-gray-300 rounded-md text-sm bg-white"
      >
        <option value="ES">ES</option>
        <option value="IT">IT</option>
        <option value="EN">EN</option>
      </select>
      <button
        onClick={handleDownload}
        disabled={downloading}
        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium disabled:opacity-50"
      >
        {downloading ? "Generando..." : "Scarica PDF"}
      </button>
    </div>
  );
}
