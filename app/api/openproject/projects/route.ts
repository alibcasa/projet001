import { NextResponse } from "next/server";
import { openProjectFetch } from "@/lib/integrations/openproject";
export async function GET() { try { const res = await openProjectFetch("/projects"); return NextResponse.json(await res.json(), { status: res.status }); } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "Erreur OpenProject" }, { status: 500 }); } }
