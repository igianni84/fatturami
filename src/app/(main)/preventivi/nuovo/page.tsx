export const dynamic = "force-dynamic";

import { getClientsForSelect, getTaxRates } from "../actions";
import QuoteForm from "../QuoteForm";

export default async function NuovoPreventivo() {
  const [clients, taxRates] = await Promise.all([
    getClientsForSelect(),
    getTaxRates(),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-6">Nuovo Preventivo</h1>
      <QuoteForm clients={clients} taxRates={taxRates} />
    </div>
  );
}
