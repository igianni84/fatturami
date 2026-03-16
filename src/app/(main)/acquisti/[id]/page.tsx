import { getPurchaseInvoice } from "../actions";
import { notFound } from "next/navigation";
import Link from "next/link";
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
import { formatCurrency } from "@/lib/formatting";
import { purchaseInvoiceStatusLabels as statusLabels, expenseCategoryLabels as categoryLabels } from "@/lib/labels";

export const dynamic = "force-dynamic";

export default async function PurchaseInvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const invoice = await getPurchaseInvoice(id);

  if (!invoice) {
    notFound();
  }

  const subtotal = invoice.lines.reduce((sum, line) => sum + line.amount, 0);
  const taxTotal = invoice.lines.reduce(
    (sum, line) => sum + line.amount * (line.taxRate.rate / 100),
    0
  );
  const total = subtotal + taxTotal;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">
          Fattura acquisto {invoice.number}
        </h1>
        <Button variant="outline" asChild>
          <Link href="/acquisti">Torna alla lista</Link>
        </Button>
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
              <div className="flex justify-between">
                <dt className="text-gray-500">Categoria:</dt>
                <dd>
                  {categoryLabels[invoice.category] || invoice.category}
                </dd>
              </div>
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
            </dl>
          </CardContent>
        </Card>

        {/* Supplier info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold uppercase text-muted-foreground">
              Fornitore
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Nome:</dt>
                <dd className="font-medium">{invoice.supplierName}</dd>
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
              <TableHead className="text-right">Importo</TableHead>
              <TableHead className="text-right">IVA</TableHead>
              <TableHead className="text-center">Deducibile</TableHead>
              <TableHead className="text-right">Totale</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoice.lines.map((line) => {
              const lineTax = line.amount * (line.taxRate.rate / 100);
              const lineTotal = line.amount + lineTax;
              return (
                <TableRow key={line.id}>
                  <TableCell>{line.description}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(line.amount)}
                  </TableCell>
                  <TableCell className="text-right">
                    {line.taxRate.name} ({line.taxRate.rate}%)
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant="outline"
                      className={
                        line.deductible
                          ? "border-green-300 bg-green-100 text-green-800"
                          : "border-red-300 bg-red-100 text-red-800"
                      }
                    >
                      {line.deductible ? "Sì" : "No"}
                    </Badge>
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
