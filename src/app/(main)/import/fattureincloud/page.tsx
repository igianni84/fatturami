import FICImportWizard from "./FICImportWizard";

export const dynamic = "force-dynamic";

export default function FICImportPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-6">Importazione da Fatture in Cloud</h1>
      <FICImportWizard />
    </div>
  );
}
