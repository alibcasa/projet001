"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Library, Scale, Landmark, BriefcaseBusiness, Cpu, BookOpen,
  Highlighter, StickyNote, Target, CircleHelp, GalleryVerticalEnd, CalendarDays,
  FolderKanban, CheckSquare, Cloud, Shield, Settings
} from "lucide-react";

const groups = [
  {
    title: "Bibliothèque documentaire",
    items: [
      ["/library", "Tous les PDF", Library],
      ["/library?rubrique=douane", "Douane", Landmark],
      ["/library?rubrique=droit", "Droit", Scale],
      ["/library?rubrique=gestion", "Gestion", BriefcaseBusiness],
      ["/library?rubrique=informatique", "Informatique", Cpu],
      ["/references", "Références", BookOpen],
    ],
  },
  {
    title: "Notes & révision",
    items: [
      ["/keynotes", "Annotations", Highlighter],
      ["/keynotes", "Notes & remarques", StickyNote],
      ["/revision", "Centre de révision", Target],
      ["/qcm", "QCM", CircleHelp],
      ["/flashcards", "Flashcards", GalleryVerticalEnd],
      ["/agenda", "Agenda", CalendarDays],
    ],
  },
  {
    title: "Organisation",
    items: [
      ["/projects", "Dossiers & projets", FolderKanban],
      ["/tasks", "Tâches", CheckSquare],
      ["/integrations", "Cloud & intégrations", Cloud],
    ],
  },
  {
    title: "Système",
    items: [
      ["/dashboard", "Tableau de bord", LayoutDashboard],
      ["/admin", "Administration", Shield],
      ["/settings", "Paramètres", Settings],
    ],
  },
] as const;

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="fixed inset-y-0 left-0 w-72 overflow-y-auto border-r border-zinc-200 bg-zinc-950 p-4 text-zinc-100">
      <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="text-xl font-bold tracking-tight">RevisionOS</div>
        <div className="mt-1 text-xs text-zinc-400">Bibliothèque juridique & douanière</div>
      </div>
      <nav className="space-y-6">
        {groups.map((group) => (
          <section key={group.title}>
            <div className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">{group.title}</div>
            <div className="space-y-1">
              {group.items.map(([href, label, Icon]) => {
                const base = href.split("?")[0];
                const active = pathname === base && !href.includes("?");
                return (
                  <Link key={href} href={href} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${active ? "bg-white text-zinc-950" : "text-zinc-300 hover:bg-white/10 hover:text-white"}`}>
                    <Icon size={18} />
                    <span>{label}</span>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </nav>
    </aside>
  );
}
