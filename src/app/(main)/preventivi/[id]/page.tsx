import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { DownloadPDFButton } from "@/components/DownloadPDFButton";

export const dynamic = "force-dynamic";

function formatCurrency(amount: number): string {
  return `€ ${amount.toLocaleString("it-IT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const statusColors: Record<string, string> = {
  bozza: "bg-gray-100 text-gray-800",
  inviato: "bg-blue-100 text-blue-800",
  accettato: "bg-green-100 text-green-800",
  rifiutato: "bg-red-100 text-red-800",
  scaduto: "bg-yellow-100 text-yellow-800",
  convertito: "bg-purple-100 text-purple-800",
};

const statusLabels: Record<string, string> = {
  bozza: "Bozza",
  inviato: "Inviato",
  accettato: "Accettato",
  rifiutato: "Rifiutato",
  scaduto: "Scaduto",
  convertito: "Convertito",
};

export default async function QuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const quote = await prisma.quote.findUnique({
    where: { id },
    include: {
      client: {
        select: { name: true, vatNumber: true, country: true },
      },
      lines: {
        include: { taxRate: { select: { name: true, rate: true } } },
      },
    },
  });

  if (!quote) {
    notFound();
  }

  const subtotal = quote.lines.reduce(
    (sum, line) => sum + Number(line.quantity) * Number(line.unitPrice),
    0
  );
  const taxTotal = quote.lines.reduce((sum, line) => {
    const lineSubtotal = Number(line.quantity) * Number(line.unitPrice);
    return sum + lineSubtotal * (Number(line.taxRate.rate) / 100);
  }, 0);
  const total = subtotal + taxTotal;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Preventivo {quote.number}
        </h1>
        <div className="flex items-center gap-3">
          <DownloadPDFButton
            documentId={quote.id}
            documentType="quote"
            defaultFilename={`${quote.number}.pdf`}
          />
          <Link
            href="/preventivi"
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm font-medium"
          >
            Torna alla lista
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Quote info */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">
            Dettagli Preventivo
          </h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Numero:</dt>
              <dd className="font-medium">{quote.number}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Data:</dt>
              <dd>{quote.date.toISOString().split("T")[0]}</dd>
            </div>
            {quote.expiryDate && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Validità:</dt>
                <dd>{quote.expiryDate.toISOString().split("T")[0]}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-gray-500">Stato:</dt>
              <dd>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[quote.status] || "bg-gray-100 text-gray-800"}`}
                >
                  {statusLabels[quote.status] || quote.status}
                </span>
              </dd>
            </div>
          </dl>
        </div>

        {/* Client info */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">
            Cliente
          </h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Nome:</dt>
              <dd className="font-medium">{quote.client.name}</dd>
            </div>
            {quote.client.vatNumber && (
              <div className="flex justify-between">
                <dt className="text-gray-500">P.IVA/VAT:</dt>
                <dd>{quote.client.vatNumber}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-gray-500">Paese:</dt>
              <dd>{quote.client.country}</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Line items table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mb-6">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Descrizione
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Quantità
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Prezzo Unitario
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                IVA
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Totale
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {quote.lines.map((line) => {
              const lineSubtotal = Number(line.quantity) * Number(line.unitPrice);
              const lineTax = lineSubtotal * (Number(line.taxRate.rate) / 100);
              const lineTotal = lineSubtotal + lineTax;
              return (
                <tr key={line.id}>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {line.description}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">
                    {Number(line.quantity)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">
                    {formatCurrency(Number(line.unitPrice))}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">
                    {line.taxRate.name} ({Number(line.taxRate.rate)}%)
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                    {formatCurrency(lineTotal)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-gray-50">
            <tr>
              <td colSpan={4} className="px-4 py-2 text-sm text-gray-500 text-right">
                Imponibile:
              </td>
              <td className="px-4 py-2 text-sm text-gray-900 text-right font-medium">
                {formatCurrency(subtotal)}
              </td>
            </tr>
            <tr>
              <td colSpan={4} className="px-4 py-2 text-sm text-gray-500 text-right">
                IVA:
              </td>
              <td className="px-4 py-2 text-sm text-gray-900 text-right font-medium">
                {formatCurrency(taxTotal)}
              </td>
            </tr>
            <tr>
              <td colSpan={4} className="px-4 py-2 text-sm text-gray-700 text-right font-semibold">
                Totale:
              </td>
              <td className="px-4 py-2 text-sm text-gray-900 text-right font-bold">
                {formatCurrency(total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Notes */}
      {quote.notes && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2">
            Note
          </h2>
          <p className="text-sm text-gray-700">{quote.notes}</p>
        </div>
      )}
    </div>
  );
}
