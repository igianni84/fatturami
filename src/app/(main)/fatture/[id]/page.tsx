import { getInvoice } from "../actions";
import { notFound } from "next/navigation";
import Link from "next/link";
import { DownloadPDFButton } from "./DownloadPDFButton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getStatusColor } from "@/lib/status-colors";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export const dynamic = "force-dynamic";

const statusLabels: Record<string, string> = {
  bozza: "Bozza",
  emessa: "Emessa",
  inviata: "Inviata",
  parzialmente_pagata: "Parzialmente pagata",
  pagata: "Pagata",
  scaduta: "Scaduta",
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
        <div className="flex gap-3 items-center">
          <DownloadPDFButton invoiceId={invoice.id} />
          {invoice.status === "bozza" && (
            <Button asChild>
              <Link href={`/fatture/${invoice.id}/modifica`}>Modifica</Link>
            </Button>
          )}
          {(["emessa", "inviata", "parzialmente_pagata", "pagata"].includes(invoice.status)) && (
            <Button variant="destructive" asChild>
              <Link href={`/note-credito/nuova/${invoice.id}`}>
                Crea nota di credito
              </Link>
            </Button>
          )}
          <Button variant="outline" asChild>
            <Link href="/fatture">Torna alla lista</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Invoice info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold uppercase text-muted-foreground">
              Dettagli Fattura
            </CardTitle>
          </CardHeader>
          <CardContent>
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
              {invoice.paidAt && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Data pagamento:</dt>
                  <dd>{invoice.paidAt}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-gray-500">Stato:</dt>
                <dd>
                  <Badge
                    variant="outline"
                    className={getStatusColor(invoice.status)}
                  >
                    {statusLabels[invoice.status] || invoice.status}
                  </Badge>
                </dd>
              </div>
              {invoice.totalPaid > 0 && (
                <>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Totale pagato:</dt>
                    <dd className="font-medium text-green-700">
                      {formatCurrency(invoice.totalPaid, invoice.currency)}
                    </dd>
                  </div>
                  {invoice.remaining > 0.01 && (
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Saldo rimanente:</dt>
                      <dd className="font-medium text-orange-700">
                        {formatCurrency(invoice.remaining, invoice.currency)}
                      </dd>
                    </div>
                  )}
                </>
              )}
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
          </CardContent>
        </Card>

        {/* Client info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold uppercase text-muted-foreground">
              Cliente
            </CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      </div>

      {/* Line items table */}
      <Card className="mb-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Descrizione</TableHead>
              <TableHead className="text-right">Quantità</TableHead>
              <TableHead className="text-right">Prezzo Unitario</TableHead>
              <TableHead className="text-right">IVA</TableHead>
              <TableHead className="text-right">Totale</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoice.lines.map((line) => {
              const lineSubtotal = line.quantity * line.unitPrice;
              const lineTax = lineSubtotal * (line.taxRate.rate / 100);
              const lineTotal = lineSubtotal + lineTax;
              return (
                <TableRow key={line.id}>
                  <TableCell>{line.description}</TableCell>
                  <TableCell className="text-right">{line.quantity}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(line.unitPrice, invoice.currency)}
                  </TableCell>
                  <TableCell className="text-right">
                    {line.taxRate.name} ({line.taxRate.rate}%)
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(lineTotal, invoice.currency)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={4} className="text-right text-muted-foreground">
                Imponibile:
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatCurrency(subtotal, invoice.currency)}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell colSpan={4} className="text-right text-muted-foreground">
                IVA:
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatCurrency(taxTotal, invoice.currency)}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell colSpan={4} className="text-right font-semibold">
                Totale:
              </TableCell>
              <TableCell className="text-right font-bold">
                {formatCurrency(total, invoice.currency)}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </Card>

      {/* Payment history */}
      {invoice.payments.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-sm font-semibold uppercase text-muted-foreground">
              Storico Pagamenti
            </CardTitle>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Metodo</TableHead>
                <TableHead>Note</TableHead>
                <TableHead className="text-right">Importo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>{payment.date}</TableCell>
                  <TableCell>{payment.method || "-"}</TableCell>
                  <TableCell>{payment.notes || "-"}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(payment.amount, invoice.currency)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={3} className="text-right font-semibold">
                  Totale pagato:
                </TableCell>
                <TableCell className="text-right font-bold text-green-700">
                  {formatCurrency(invoice.totalPaid, invoice.currency)}
                </TableCell>
              </TableRow>
              {invoice.remaining > 0.01 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-right font-semibold">
                    Saldo rimanente:
                  </TableCell>
                  <TableCell className="text-right font-bold text-orange-700">
                    {formatCurrency(invoice.remaining, invoice.currency)}
                  </TableCell>
                </TableRow>
              )}
            </TableFooter>
          </Table>
        </Card>
      )}

      {/* Disclaimer */}
      {invoice.disclaimer && (
        <Alert className="border-yellow-300 bg-yellow-50 mb-6">
          <AlertTitle className="text-yellow-800">Avvertenze Legali</AlertTitle>
          <AlertDescription className="text-yellow-700">
            {invoice.disclaimer}
          </AlertDescription>
        </Alert>
      )}

      {/* Notes */}
      {invoice.notes && (
        <Card className="bg-muted">
          <CardHeader>
            <CardTitle className="text-sm font-semibold uppercase text-muted-foreground">
              Note
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{invoice.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
