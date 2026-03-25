export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { getSuppliers } from "./actions";
import SupplierList from "./SupplierList";

interface PageProps {
  searchParams: Promise<{ search?: string; page?: string }>;
}

export default async function FornitoriPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const search = params.search || "";
  const page = Math.max(1, parseInt(params.page || "1", 10));

  const { suppliers, totalCount } = await getSuppliers(search, page, 10);

  return (
    <Suspense>
      <SupplierList
        suppliers={suppliers}
        totalCount={totalCount}
        page={page}
        search={search}
      />
    </Suspense>
  );
}
