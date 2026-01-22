import PDFBatchImporter from "./PDFBatchImporter";

export const dynamic = "force-dynamic";

export default function PDFImportPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Importazione Batch PDF</h1>
      <PDFBatchImporter />
    </div>
  );
}
