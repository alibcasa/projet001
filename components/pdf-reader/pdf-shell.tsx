"use client";

import { useMemo, useState } from "react";
import PdfToolbar from "./pdf-toolbar";
import { calculateReadingProgress } from "@/lib/reading-progress";

export default function PdfShell() {
  const totalPages = 524;
  const [page, setPage] = useState(186);
  const [viewed, setViewed] = useState<number[]>([...Array(185)].map((_, i) => i + 1));
  const progress = useMemo(() => calculateReadingProgress(viewed, totalPages), [viewed]);

  const go = (p: number) => {
    const next = Math.min(totalPages, Math.max(1, p));
    setPage(next);
    setViewed(v => Array.from(new Set([...v, next])));
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <PdfToolbar page={page} totalPages={totalPages} onPrev={() => go(page - 1)} onNext={() => go(page + 1)} />
      <div className="grid min-h-[680px] grid-cols-[180px_1fr_260px]">
        <aside className="border-r border-gray-200 p-3">
          <div className="text-xs font-semibold uppercase text-gray-400">Pages</div>
          <div className="mt-3 space-y-2 text-sm">
            {[page-1,page,page+1].filter(p => p > 0 && p <= totalPages).map(p => (
              <button onClick={() => go(p)} key={p} className={`block w-full rounded-lg border p-3 text-left ${p===page?"border-gray-900":"border-gray-200"}`}>
                Page {p}
              </button>
            ))}
          </div>
        </aside>
        <main className="flex items-center justify-center bg-gray-100 p-8">
          <div className="flex aspect-[1/1.414] w-full max-w-[620px] items-center justify-center bg-white shadow">
            <div className="text-center">
              <div className="text-xl font-semibold">Aperçu PDF.js</div>
              <div className="mt-2 text-gray-500">Page {page}</div>
              <div className="mt-4 text-sm text-gray-400">Le composant de rendu PDF.js est branché ici.</div>
            </div>
          </div>
        </main>
        <aside className="border-l border-gray-200 p-4">
          <div className="font-semibold">Keynotes</div>
          <div className="mt-4 space-y-3 text-sm">
            <div className="rounded-xl bg-gray-50 p-3">⚖ Règle juridique importante</div>
            <div className="rounded-xl bg-gray-50 p-3">📌 À mémoriser</div>
            <div className="rounded-xl bg-gray-50 p-3">? Question à revoir</div>
          </div>
          <div className="mt-6">
            <div className="mb-1 flex justify-between text-xs"><span>Progression réelle</span><span>{progress}%</span></div>
            <div className="h-2 rounded bg-gray-100"><div className="h-2 rounded bg-gray-900" style={{width:`${progress}%`}}/></div>
          </div>
        </aside>
      </div>
    </div>
  );
}
