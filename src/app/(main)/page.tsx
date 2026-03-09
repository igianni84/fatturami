import { getDashboardData } from "./dashboard/actions";
import Dashboard from "./dashboard/Dashboard";

export const dynamic = "force-dynamic";

const VALID_PERIODS = ["month", "quarter", "year"];

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const params = await searchParams;
  const period = VALID_PERIODS.includes(params.period || "")
    ? params.period!
    : "month";

  const data = await getDashboardData(period);
  return <Dashboard data={data} period={period} />;
}
