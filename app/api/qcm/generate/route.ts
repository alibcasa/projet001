import { NextResponse } from "next/server";
import { z } from "zod";
const schema = z.object({ documentIds: z.array(z.string()).min(1), questionCount: z.number().int().min(1).max(200), difficulty: z.enum(["easy","medium","hard","mixed"]).default("mixed"), sourceMode: z.enum(["full_documents","pages","keynotes","selection"]).default("full_documents") });
export async function POST(req: Request) { const parsed = schema.safeParse(await req.json()); if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 }); return NextResponse.json({ status: "queued", request: parsed.data, traceability: "Chaque question doit conserver documentId, pageNumber et sourceExcerpt." }); }
