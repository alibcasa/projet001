import PdfShell from "@/components/pdf-reader/pdf-shell";

export default async function ReaderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Lecteur PDF</h1>
        <p className="text-sm text-gray-500">Document #{id} · reprise automatique · progression réelle · keynotes.</p>
      </div>
      <PdfShell />
    </div>
  );
}
