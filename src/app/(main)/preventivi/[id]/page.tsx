import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { DownloadPDFButton } from "@/components/DownloadPDFButton";
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

export const dynamic = "force-dynamic";

function formatCurrency(amount: number): string {
  return `€ ${amount.toLocaleString("it-IT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}


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
          <Button variant="outline" asChild>
            <Link href="/preventivi">Torna alla lista</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Quote info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold uppercase text-muted-foreground">
              Dettagli Preventivo
            </CardTitle>
          </CardHeader>
          <CardContent>
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
                  <Badge
                    variant="outline"
                    className={getStatusColor(quote.status)}
                  >
                    {statusLabels[quote.status] || quote.status}
                  </Badge>
                </dd>
              </div>
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
            {quote.lines.map((line) => {
              const lineSubtotal = Number(line.quantity) * Number(line.unitPrice);
              const lineTax = lineSubtotal * (Number(line.taxRate.rate) / 100);
              const lineTotal = lineSubtotal + lineTax;
              return (
                <TableRow key={line.id}>
                  <TableCell>{line.description}</TableCell>
                  <TableCell className="text-right">
                    {Number(line.quantity)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(Number(line.unitPrice))}
                  </TableCell>
                  <TableCell className="text-right">
                    {line.taxRate.name} ({Number(line.taxRate.rate)}%)
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(lineTotal)}
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
                {formatCurrency(subtotal)}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell colSpan={4} className="text-right text-muted-foreground">
                IVA:
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatCurrency(taxTotal)}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell colSpan={4} className="text-right font-semibold">
                Totale:
              </TableCell>
              <TableCell className="text-right font-bold">
                {formatCurrency(total)}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </Card>

      {/* Notes */}
      {quote.notes && (
        <Card className="bg-muted">
          <CardHeader>
            <CardTitle className="text-sm font-semibold uppercase text-muted-foreground">
              Note
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{quote.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
