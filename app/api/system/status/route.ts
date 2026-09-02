import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { paperlessStatus } from '@/lib/paperless'
import { discoverJoplin, joplinRequest } from '@/lib/joplin'

async function reachable(url:string, init?:RequestInit){
  try{
    const r=await fetch(url,{...init,cache:'no-store',signal:AbortSignal.timeout(4000)})
    return r.ok
  }catch{return false}
}

export async function GET(){
  const supabaseConfigured=Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL&&process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
  let supabaseReady=false
  let joplin={configured:false,ready:false,url:null as string|null,error:null as string|null}

  try{
    const s=await createClient()
    const {data:{user}}=await s.auth.getUser()
    const {error}=await s.from('categories').select('id',{head:true,count:'exact'})
    supabaseReady=supabaseConfigured&&!error

    if(user){
      const {data}=await s.from('integrations').select('enabled,config').eq('user_id',user.id).eq('provider','joplin').maybeSingle()
      const cfg=(data?.config||{}) as {baseUrl?:string;token?:string}
      if(data?.enabled&&cfg.baseUrl&&cfg.token){
        joplin.configured=true
        joplin.url=cfg.baseUrl
        try{
          await joplinRequest(cfg.baseUrl,cfg.token,'/folders?fields=id&limit=1')
          joplin.ready=true
        }catch(e:any){joplin.error=e?.message||'Joplin indisponible'}
      }else{
        const discovered=await discoverJoplin()
        joplin={configured:Boolean(discovered),ready:false,url:discovered,error:discovered?'Joplin détecté mais non autorisé':'Joplin/Web Clipper hors ligne'}
      }
    }
  }catch{}

  const ollamaUrl=process.env.OLLAMA_BASE_URL||'http://127.0.0.1:11434'
  const ollama=await reachable(`${ollamaUrl.replace(/\/$/,'')}/api/tags`)

  const paperless=await paperlessStatus()

  const opUrl=process.env.OPENPROJECT_URL||''
  const opToken=process.env.OPENPROJECT_API_TOKEN||''
  const openproject=Boolean(opUrl&&opToken)&&await reachable(`${opUrl.replace(/\/$/,'')}/api/v3`,{
    headers:{Authorization:`Basic ${Buffer.from(`apikey:${opToken}`).toString('base64')}`}
  })

  return NextResponse.json({
    supabase:{configured:supabaseConfigured,ready:supabaseReady},
    ollama:{configured:true,ready:ollama,url:ollamaUrl,model:process.env.OLLAMA_MODEL||'qwen3:4b'},
    paperless:{configured:Boolean(process.env.PAPERLESS_API_TOKEN),ready:paperless.ok,url:paperless.url,error:paperless.ok?null:paperless.error},
    joplin,
    openproject:{configured:Boolean(opUrl&&opToken),ready:openproject,url:opUrl||null},
    google:{configured:Boolean(process.env.GOOGLE_CLIENT_ID&&process.env.GOOGLE_CLIENT_SECRET),ready:false},
    microsoft:{configured:Boolean(process.env.MICROSOFT_CLIENT_ID&&process.env.MICROSOFT_CLIENT_SECRET),ready:false},
    hypothesis:{configured:Boolean(process.env.HYPOTHESIS_API_TOKEN),ready:false},
  })
}
