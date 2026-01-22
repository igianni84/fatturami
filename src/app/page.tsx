import { getDashboardData } from "./dashboard/actions";
import Dashboard from "./dashboard/Dashboard";

export const dynamic = "force-dynamic";

export default async function Home() {
  const initialData = await getDashboardData("month");

  return <Dashboard initialData={initialData} />;
}
