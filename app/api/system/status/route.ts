import { NextResponse } from "next/server";

async function reachable(url:string, init?:RequestInit){try{const r=await fetch(url,{...init,cache:'no-store',signal:AbortSignal.timeout(4000)});return r.ok}catch{return false}}

export async function GET(){
  const supabase=Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL&&process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
  const ollama=await reachable(`${process.env.OLLAMA_BASE_URL||'http://127.0.0.1:11434'}/api/tags`)
  const opUrl=process.env.OPENPROJECT_URL||''
  const opToken=process.env.OPENPROJECT_API_TOKEN||''
  const openproject=Boolean(opUrl&&opToken)&&await reachable(`${opUrl.replace(/\/$/,'')}/api/v3`,{headers:{Authorization:`Basic ${Buffer.from(`apikey:${opToken}`).toString('base64')}`}})
  return NextResponse.json({
    supabase:{configured:supabase,ready:supabase},
    ollama:{configured:true,ready:ollama,model:process.env.OLLAMA_MODEL||'qwen3:4b'},
    openproject:{configured:Boolean(opUrl&&opToken),ready:openproject,url:opUrl||null},
    google:{configured:Boolean(process.env.GOOGLE_CLIENT_ID&&process.env.GOOGLE_CLIENT_SECRET)},
    microsoft:{configured:Boolean(process.env.MICROSOFT_CLIENT_ID&&process.env.MICROSOFT_CLIENT_SECRET)},
    hypothesis:{configured:Boolean(process.env.HYPOTHESIS_API_TOKEN)},
  })
}
