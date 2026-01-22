export const dynamic = "force-dynamic";

import { getInvoices } from "./actions";
import InvoiceList from "./InvoiceList";

export default async function FatturePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);
  const status = params.status || "tutti";

  const { invoices, totalCount } = await getInvoices({
    page,
    pageSize: 10,
    status,
  });

  return (
    <InvoiceList
      invoices={invoices}
      totalCount={totalCount}
      page={page}
      currentStatus={status}
    />
  );
}
