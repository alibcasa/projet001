import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function slugify(value:string){
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')
}

export async function GET(){
  const supabase=await createClient()
  const {data:{user}}=await supabase.auth.getUser()
  if(!user)return NextResponse.json({error:'Unauthorized'},{status:401})
  const {data,error}=await supabase.from('categories').select('id,name,slug,parent_id').order('name')
  if(error)return NextResponse.json({error:error.message},{status:400})
  return NextResponse.json(data||[])
}

export async function POST(request:Request){
  const supabase=await createClient()
  const {data:{user}}=await supabase.auth.getUser()
  if(!user)return NextResponse.json({error:'Unauthorized'},{status:401})
  const body=await request.json()
  const name=String(body.name||'').trim()
  if(!name)return NextResponse.json({error:'Nom obligatoire'},{status:400})
  const slug=slugify(String(body.slug||name))
  const {data,error}=await supabase.from('categories').insert({name,slug,parent_id:body.parent_id||null}).select().single()
  if(error)return NextResponse.json({error:error.message},{status:400})
  return NextResponse.json(data,{status:201})
}
