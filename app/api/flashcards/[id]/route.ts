import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function dueAfterDays(days:number){const d=new Date();d.setDate(d.getDate()+days);return d.toISOString()}
function dueAfterMinutes(minutes:number){return new Date(Date.now()+minutes*60000).toISOString()}

export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params
  const s=await createClient()
  const {data:{user}}=await s.auth.getUser()
  if(!user)return NextResponse.json({error:'Unauthorized'},{status:401})

  const body=await request.json()
  const {data:card,error:readError}=await s.from('flashcards').select('*').eq('id',id).eq('user_id',user.id).maybeSingle()
  if(readError||!card)return NextResponse.json({error:readError?.message||'Flashcard introuvable'},{status:404})

  const updates:Record<string,unknown>={}
  if(body.front!==undefined)updates.front=String(body.front).trim()
  if(body.back!==undefined)updates.back=String(body.back).trim()
  if(body.document_id!==undefined)updates.document_id=body.document_id||null
  if(body.source_page!==undefined)updates.source_page=body.source_page?Number(body.source_page):null

  if(body.rating){
    const rating=String(body.rating)
    let ease=Math.max(1.3,Number(card.ease_factor||2.5))
    let repetitions=Number(card.repetitions||0)
    let interval=Number(card.interval_days||0)
    let dueAt=''

    if(rating==='again'){
      repetitions=0;interval=0;ease=Math.max(1.3,ease-0.2);dueAt=dueAfterMinutes(10)
    }else if(rating==='hard'){
      repetitions+=1;interval=Math.max(1,interval?Math.ceil(interval*1.2):1);ease=Math.max(1.3,ease-0.15);dueAt=dueAfterDays(interval)
    }else if(rating==='good'){
      repetitions+=1
      interval=repetitions===1?1:repetitions===2?6:Math.max(1,Math.round(Math.max(interval,1)*ease))
      dueAt=dueAfterDays(interval)
    }else if(rating==='easy'){
      repetitions+=1;ease=Math.min(3.2,ease+0.15)
      interval=repetitions===1?4:Math.max(2,Math.round(Math.max(interval,1)*ease*1.3))
      dueAt=dueAfterDays(interval)
    }else return NextResponse.json({error:'Évaluation invalide'},{status:400})

    updates.ease_factor=ease
    updates.repetitions=repetitions
    updates.interval_days=interval
    updates.due_at=dueAt
  }

  if(updates.front==='')return NextResponse.json({error:'Recto obligatoire'},{status:400})
  if(updates.back==='')return NextResponse.json({error:'Verso obligatoire'},{status:400})
  const {data,error}=await s.from('flashcards').update(updates).eq('id',id).eq('user_id',user.id).select().single()
  return error?NextResponse.json({error:error.message},{status:400}):NextResponse.json(data)
}

export async function DELETE(_:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params
  const s=await createClient()
  const {data:{user}}=await s.auth.getUser()
  if(!user)return NextResponse.json({error:'Unauthorized'},{status:401})
  const {error}=await s.from('flashcards').delete().eq('id',id).eq('user_id',user.id)
  return error?NextResponse.json({error:error.message},{status:400}):NextResponse.json({ok:true})
}
