import CSVImporter from "./CSVImporter";

export const dynamic = "force-dynamic";

export default function CSVImportPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-6">Importazione CSV</h1>
      <CSVImporter />
    </div>
  );
}
