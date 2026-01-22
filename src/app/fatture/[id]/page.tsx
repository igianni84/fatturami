import { getInvoice } from "../actions";
import { notFound } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

const statusLabels: Record<string, string> = {
  bozza: "Bozza",
  emessa: "Emessa",
  inviata: "Inviata",
  pagata: "Pagata",
  scaduta: "Scaduta",
};

const statusColors: Record<string, string> = {
  bozza: "bg-gray-100 text-gray-800",
  emessa: "bg-blue-100 text-blue-800",
  inviata: "bg-indigo-100 text-indigo-800",
  pagata: "bg-green-100 text-green-800",
  scaduta: "bg-red-100 text-red-800",
};

const vatRegimeLabels: Record<string, string> = {
  nazionale: "Nazionale",
  intraUE: "Intra-UE",
  extraUE: "Extra-UE",
};

function formatCurrency(amount: number, currency: string): string {
  const symbol = currency === "EUR" ? "€" : currency === "GBP" ? "£" : "$";
  return `${symbol} ${amount.toLocaleString("it-IT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const invoice = await getInvoice(id);

  if (!invoice) {
    notFound();
  }

  const subtotal = invoice.lines.reduce(
    (sum, line) => sum + line.quantity * line.unitPrice,
    0
  );
  const taxTotal = invoice.lines.reduce((sum, line) => {
    const lineSubtotal = line.quantity * line.unitPrice;
    return sum + lineSubtotal * (line.taxRate.rate / 100);
  }, 0);
  const total = subtotal + taxTotal;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Fattura {invoice.number}
        </h1>
        <div className="flex gap-3">
          {invoice.status === "bozza" && (
            <Link
              href={`/fatture/${invoice.id}/modifica`}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
            >
              Modifica
            </Link>
          )}
          {(invoice.status === "emessa" || invoice.status === "inviata" || invoice.status === "pagata") && (
            <Link
              href={`/note-credito/nuova/${invoice.id}`}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-medium"
            >
              Crea nota di credito
            </Link>
          )}
          <Link
            href="/fatture"
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm font-medium"
          >
            Torna alla lista
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Invoice info */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">
            Dettagli Fattura
          </h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Numero:</dt>
              <dd className="font-medium">{invoice.number}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Data:</dt>
              <dd>{invoice.date}</dd>
            </div>
            {invoice.dueDate && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Scadenza:</dt>
                <dd>{invoice.dueDate}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-gray-500">Stato:</dt>
              <dd>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[invoice.status] || "bg-gray-100 text-gray-800"}`}
                >
                  {statusLabels[invoice.status] || invoice.status}
                </span>
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Valuta:</dt>
              <dd>{invoice.currency}</dd>
            </div>
            {invoice.currency !== "EUR" && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Tasso di cambio:</dt>
                <dd>{invoice.exchangeRate}</dd>
              </div>
            )}
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
              <dd className="font-medium">{invoice.client.name}</dd>
            </div>
            {invoice.client.vatNumber && (
              <div className="flex justify-between">
                <dt className="text-gray-500">P.IVA/VAT:</dt>
                <dd>{invoice.client.vatNumber}</dd>
              </div>
            )}
            {invoice.client.address && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Indirizzo:</dt>
                <dd>{invoice.client.address}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-gray-500">Paese:</dt>
              <dd>{invoice.client.country}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Regime IVA:</dt>
              <dd>{vatRegimeLabels[invoice.client.vatRegime] || invoice.client.vatRegime}</dd>
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
            {invoice.lines.map((line) => {
              const lineSubtotal = line.quantity * line.unitPrice;
              const lineTax = lineSubtotal * (line.taxRate.rate / 100);
              const lineTotal = lineSubtotal + lineTax;
              return (
                <tr key={line.id}>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {line.description}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">
                    {line.quantity}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">
                    {formatCurrency(line.unitPrice, invoice.currency)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">
                    {line.taxRate.name} ({line.taxRate.rate}%)
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                    {formatCurrency(lineTotal, invoice.currency)}
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
                {formatCurrency(subtotal, invoice.currency)}
              </td>
            </tr>
            <tr>
              <td colSpan={4} className="px-4 py-2 text-sm text-gray-500 text-right">
                IVA:
              </td>
              <td className="px-4 py-2 text-sm text-gray-900 text-right font-medium">
                {formatCurrency(taxTotal, invoice.currency)}
              </td>
            </tr>
            <tr>
              <td colSpan={4} className="px-4 py-2 text-sm text-gray-700 text-right font-semibold">
                Totale:
              </td>
              <td className="px-4 py-2 text-sm text-gray-900 text-right font-bold">
                {formatCurrency(total, invoice.currency)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Disclaimer */}
      {invoice.disclaimer && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <h2 className="text-sm font-semibold text-yellow-800 mb-2">
            Avvertenze Legali
          </h2>
          <p className="text-sm text-yellow-700">{invoice.disclaimer}</p>
        </div>
      )}

      {/* Notes */}
      {invoice.notes && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2">
            Note
          </h2>
          <p className="text-sm text-gray-700">{invoice.notes}</p>
        </div>
      )}
    </div>
  );
}
