import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params
  const s=await createClient()
  const {data:{user}}=await s.auth.getUser()
  if(!user)return NextResponse.json({error:'Unauthorized'},{status:401})
  const b=await request.json()
  const allowed=['page_number','quote','selector','keynote_type','content','comment','importance','tags','visibility'] as const
  const updates:Record<string,unknown>={}
  for(const key of allowed)if(b[key]!==undefined)updates[key]=b[key]
  const {data,error}=await s.from('keynotes').update(updates).eq('id',id).eq('user_id',user.id).select().single()
  return error?NextResponse.json({error:error.message},{status:400}):NextResponse.json(data)
}

export async function DELETE(_:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params
  const s=await createClient()
  const {data:{user}}=await s.auth.getUser()
  if(!user)return NextResponse.json({error:'Unauthorized'},{status:401})
  const {error}=await s.from('keynotes').delete().eq('id',id).eq('user_id',user.id)
  return error?NextResponse.json({error:error.message},{status:400}):NextResponse.json({ok:true})
}
