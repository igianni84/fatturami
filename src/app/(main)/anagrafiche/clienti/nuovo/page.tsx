import ClientForm from "../ClientForm";
import { getCompanyCountry } from "@/app/(main)/impostazioni/actions";

export const dynamic = "force-dynamic";

export default async function NuovoClientePage() {
  const companyCountry = await getCompanyCountry();
  return <ClientForm companyCountry={companyCountry} />;
}
