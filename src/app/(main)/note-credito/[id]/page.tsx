import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { DownloadPDFButton } from "@/components/DownloadPDFButton";
import { Button } from "@/components/ui/button";
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
          <Button variant="outline" asChild>
            <Link href="/note-credito">Torna alla lista</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Credit note info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold uppercase text-muted-foreground">
              Dettagli Nota di Credito
            </CardTitle>
          </CardHeader>
          <CardContent>
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
            {creditNote.lines.map((line) => {
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
                    {formatCurrency(Number(line.unitPrice), currency)}
                  </TableCell>
                  <TableCell className="text-right">
                    {line.taxRate.name} ({Number(line.taxRate.rate)}%)
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(lineTotal, currency)}
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
                {formatCurrency(subtotal, currency)}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell colSpan={4} className="text-right text-muted-foreground">
                IVA:
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatCurrency(taxTotal, currency)}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell colSpan={4} className="text-right font-semibold">
                Totale:
              </TableCell>
              <TableCell className="text-right font-bold">
                {formatCurrency(total, currency)}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </Card>

      {/* Notes */}
      {creditNote.notes && (
        <Card className="bg-muted">
          <CardHeader>
            <CardTitle className="text-sm font-semibold uppercase text-muted-foreground">
              Note
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{creditNote.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
