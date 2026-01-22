import { getCompany } from "./actions";
import CompanyForm from "./CompanyForm";

export const dynamic = "force-dynamic";

export default async function ImpostazioniPage() {
  const company = await getCompany();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Impostazioni</h1>
      <div className="bg-white rounded-lg shadow p-6 max-w-2xl">
        <h2 className="text-lg font-semibold mb-4">Dati Aziendali</h2>
        <CompanyForm initialData={company} />
      </div>
    </div>
  );
}
