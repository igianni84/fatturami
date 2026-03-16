import { getCompany } from "./actions";
import CompanyForm from "./CompanyForm";
import ChangePasswordForm from "./ChangePasswordForm";

export const dynamic = "force-dynamic";

export default async function ImpostazioniPage() {
  const company = await getCompany();

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-6">Impostazioni</h1>
      <div className="bg-white rounded-lg shadow p-6 max-w-2xl mb-6">
        <h2 className="text-lg font-semibold mb-4">Dati Aziendali</h2>
        <CompanyForm initialData={company} />
      </div>
      <div className="bg-white rounded-lg shadow p-6 max-w-2xl">
        <h2 className="text-lg font-semibold mb-4">Cambia Password</h2>
        <ChangePasswordForm />
      </div>
    </div>
  );
}
