import PurchaseInvoiceForm from "./PurchaseInvoiceForm";
import { getSuppliersForSelect, getTaxRates } from "../actions";

export const dynamic = "force-dynamic";

export default async function NuovoAcquistoPage() {
  const [suppliers, taxRates] = await Promise.all([
    getSuppliersForSelect(),
    getTaxRates(),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Registra fattura di acquisto
      </h1>
      <PurchaseInvoiceForm suppliers={suppliers} taxRates={taxRates} />
    </div>
  );
}
