export const dynamic = "force-dynamic";

import { getVATReport } from "./actions";
import VATReport from "./VATReport";

export default async function IVAPage() {
  const now = new Date();
  const year = now.getFullYear();
  const quarter = Math.floor(now.getMonth() / 3) + 1;

  const data = await getVATReport(year, quarter);

  return <VATReport initialData={data} initialYear={year} initialQuarter={quarter} />;
}
