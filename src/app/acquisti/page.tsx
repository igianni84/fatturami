import { getPurchaseInvoices, getSuppliersForSelect } from "./actions";
import PurchaseInvoiceList from "./PurchaseInvoiceList";

export const dynamic = "force-dynamic";

export default async function AcquistiPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const status = (params.status as string) || "tutti";
  const supplierId = (params.supplierId as string) || "";
  const category = (params.category as string) || "tutte";
  const dateFrom = (params.dateFrom as string) || "";
  const dateTo = (params.dateTo as string) || "";

  const [{ purchaseInvoices, totalCount }, suppliers] = await Promise.all([
    getPurchaseInvoices({
      page,
      status,
      supplierId: supplierId || undefined,
      category: category || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    }),
    getSuppliersForSelect(),
  ]);

  return (
    <PurchaseInvoiceList
      purchaseInvoices={purchaseInvoices}
      totalCount={totalCount}
      page={page}
      suppliers={suppliers}
      currentStatus={status}
      currentSupplierId={supplierId}
      currentCategory={category}
      currentDateFrom={dateFrom}
      currentDateTo={dateTo}
    />
  );
}
