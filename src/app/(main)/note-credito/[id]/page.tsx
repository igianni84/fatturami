import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { DownloadPDFButton } from "@/components/DownloadPDFButton";

export const dynamic = "force-dynamic";

function formatCurrency(amount: number, currency: string): string {
  const symbol = currency === "EUR" ? "€" : currency === "GBP" ? "£" : "$";
  return `${symbol} ${amount.toLocaleString("it-IT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default async function CreditNoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const creditNote = await prisma.creditNote.findUnique({
    where: { id },
    include: {
      invoice: {
        include: {
          client: { select: { name: true } },
        },
      },
      lines: {
        include: { taxRate: { select: { name: true, rate: true } } },
      },
    },
  });

  if (!creditNote) {
    notFound();
  }

  const currency = creditNote.invoice.currency;

  const subtotal = creditNote.lines.reduce(
    (sum, line) => sum + Number(line.quantity) * Number(line.unitPrice),
    0
  );
  const taxTotal = creditNote.lines.reduce((sum, line) => {
    const lineSubtotal = Number(line.quantity) * Number(line.unitPrice);
    return sum + lineSubtotal * (Number(line.taxRate.rate) / 100);
  }, 0);
  const total = subtotal + taxTotal;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Nota di Credito {creditNote.number}
        </h1>
        <div className="flex items-center gap-3">
          <DownloadPDFButton
            documentId={creditNote.id}
            documentType="credit-note"
            defaultFilename={`${creditNote.number}.pdf`}
          />
          <Link
            href="/note-credito"
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm font-medium"
          >
            Torna alla lista
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Credit note info */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">
            Dettagli Nota di Credito
          </h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Numero:</dt>
              <dd className="font-medium">{creditNote.number}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Data:</dt>
              <dd>{creditNote.date.toISOString().split("T")[0]}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Fattura di riferimento:</dt>
              <dd>
                <Link
                  href={`/fatture/${creditNote.invoice.id}`}
                  className="text-blue-600 hover:underline font-medium"
                >
                  {creditNote.invoice.number}
                </Link>
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Cliente:</dt>
              <dd className="font-medium">{creditNote.invoice.client.name}</dd>
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
            {creditNote.lines.map((line) => {
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
                    {formatCurrency(Number(line.unitPrice), currency)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">
                    {line.taxRate.name} ({Number(line.taxRate.rate)}%)
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                    {formatCurrency(lineTotal, currency)}
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
                {formatCurrency(subtotal, currency)}
              </td>
            </tr>
            <tr>
              <td colSpan={4} className="px-4 py-2 text-sm text-gray-500 text-right">
                IVA:
              </td>
              <td className="px-4 py-2 text-sm text-gray-900 text-right font-medium">
                {formatCurrency(taxTotal, currency)}
              </td>
            </tr>
            <tr>
              <td colSpan={4} className="px-4 py-2 text-sm text-gray-700 text-right font-semibold">
                Totale:
              </td>
              <td className="px-4 py-2 text-sm text-gray-900 text-right font-bold">
                {formatCurrency(total, currency)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Notes */}
      {creditNote.notes && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2">
            Note
          </h2>
          <p className="text-sm text-gray-700">{creditNote.notes}</p>
        </div>
      )}
    </div>
  );
}
