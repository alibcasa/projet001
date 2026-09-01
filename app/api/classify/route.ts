import { NextResponse } from "next/server";
import { classifyText } from "@/lib/classification";
export async function POST(req: Request) { const body = await req.json(); return NextResponse.json(classifyText(String(body?.text || ""))); }
