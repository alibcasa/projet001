import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function slugify(value:string){
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')
}

export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params
  const supabase=await createClient()
  const {data:{user}}=await supabase.auth.getUser()
  if(!user)return NextResponse.json({error:'Unauthorized'},{status:401})
  const body=await request.json()
  const updates:{name?:string;slug?:string;parent_id?:string|null}={}
  if(body.name!==undefined){
    const name=String(body.name).trim()
    if(!name)return NextResponse.json({error:'Nom obligatoire'},{status:400})
    updates.name=name
    updates.slug=slugify(String(body.slug||name))
  }
  if(body.parent_id!==undefined)updates.parent_id=body.parent_id||null
  const {data,error}=await supabase.from('categories').update(updates).eq('id',id).select().single()
  if(error)return NextResponse.json({error:error.message},{status:400})
  return NextResponse.json(data)
}

export async function DELETE(_:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params
  const supabase=await createClient()
  const {data:{user}}=await supabase.auth.getUser()
  if(!user)return NextResponse.json({error:'Unauthorized'},{status:401})
  const {count}=await supabase.from('document_categories').select('*',{count:'exact',head:true}).eq('category_id',id)
  if((count||0)>0)return NextResponse.json({error:'Cette catégorie contient des PDF. Réaffectez-les avant suppression.'},{status:409})
  const {error}=await supabase.from('categories').delete().eq('id',id)
  if(error)return NextResponse.json({error:error.message},{status:400})
  return NextResponse.json({ok:true})
}
