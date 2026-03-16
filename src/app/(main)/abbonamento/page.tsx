import { getBillingDashboardData } from "./actions";
import BillingDashboard from "./BillingDashboard";

export const dynamic = "force-dynamic";

export default async function AbbonamentoPage() {
  const billing = await getBillingDashboardData();
  return <BillingDashboard billing={billing} />;
}
