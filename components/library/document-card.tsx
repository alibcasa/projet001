import Link from "next/link";

export default function DocumentCard({
  id, title, category, progress
}: { id: string; title: string; category: string; progress: number }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="text-xs text-gray-400">{category}</div>
      <div className="mt-1 font-semibold">{title}</div>
      <div className="mt-4 h-2 rounded bg-gray-100">
        <div className="h-2 rounded bg-gray-900" style={{ width: `${progress}%` }} />
      </div>
      <div className="mt-2 flex justify-between text-xs text-gray-500">
        <span>{progress}% lu</span>
        <Link className="font-medium text-gray-900" href={`/reader/${id}`}>Ouvrir</Link>
      </div>
    </div>
  );
}
