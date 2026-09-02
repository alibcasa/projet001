import { NextRequest, NextResponse } from "next/server";
import { openProjectFetch } from "@/lib/integrations/openproject";

export async function GET() {
  try {
    const res = await openProjectFetch("/projects");
    return NextResponse.json(await res.json(), { status: res.status });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erreur OpenProject" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = String(body?.name || "").trim();
    if (!name) return NextResponse.json({ error: "Nom du projet requis" }, { status: 400 });
    const identifier = String(body?.identifier || name)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 100) || `revisionos-${Date.now()}`;

    const res = await openProjectFetch("/projects", {
      method: "POST",
      body: JSON.stringify({ name, identifier, active: true, public: false }),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erreur OpenProject" }, { status: 500 });
  }
}
