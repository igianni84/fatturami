import { notFound } from "next/navigation";
import { getSupplier } from "../../actions";
import SupplierForm from "../../SupplierForm";

export const dynamic = "force-dynamic";

export default async function ModificaFornitorePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supplierData = await getSupplier(id);

  if (!supplierData) {
    notFound();
  }

  return <SupplierForm initialData={supplierData} supplierId={id} />;
}
