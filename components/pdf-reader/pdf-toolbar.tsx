"use client";
import { ChevronLeft, ChevronRight, Search, ZoomIn, ZoomOut, Maximize, Bookmark, Highlighter } from "lucide-react";

export default function PdfToolbar({
  page, totalPages, onPrev, onNext
}: { page: number; totalPages: number; onPrev: () => void; onNext: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 bg-white p-3">
      <button onClick={onPrev} className="rounded-lg p-2 hover:bg-gray-100"><ChevronLeft size={18}/></button>
      <span className="text-sm">{page} / {totalPages}</span>
      <button onClick={onNext} className="rounded-lg p-2 hover:bg-gray-100"><ChevronRight size={18}/></button>
      <div className="mx-2 h-5 w-px bg-gray-200" />
      <button className="rounded-lg p-2 hover:bg-gray-100"><Search size={18}/></button>
      <button className="rounded-lg p-2 hover:bg-gray-100"><ZoomOut size={18}/></button>
      <span className="text-sm">100%</span>
      <button className="rounded-lg p-2 hover:bg-gray-100"><ZoomIn size={18}/></button>
      <button className="rounded-lg p-2 hover:bg-gray-100"><Maximize size={18}/></button>
      <button className="rounded-lg p-2 hover:bg-gray-100"><Bookmark size={18}/></button>
      <button className="rounded-lg p-2 hover:bg-gray-100"><Highlighter size={18}/></button>
    </div>
  );
}
