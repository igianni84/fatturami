export const dynamic = "force-dynamic";

import { getClientsForInvoice, getTaxRatesForInvoice } from "../actions";
import InvoiceForm from "../InvoiceForm";

export default async function NuovaFattura() {
  const [clients, taxRates] = await Promise.all([
    getClientsForInvoice(),
    getTaxRatesForInvoice(),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Nuova Fattura</h1>
      <InvoiceForm clients={clients} taxRates={taxRates} />
    </div>
  );
}
