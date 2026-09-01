import {NextResponse} from 'next/server'
import {createClient} from '@/lib/supabase/server'
export async function GET(){const s=await createClient();const{data,error}=await s.from('agenda_events').select('*').order('start_at');return error?NextResponse.json({error:error.message},{status:400}):NextResponse.json(data)}
export async function POST(r:Request){const s=await createClient();const{data:{user}}=await s.auth.getUser();if(!user)return NextResponse.json({error:'Unauthorized'},{status:401});const b=await r.json();const{data,error}=await s.from('agenda_events').insert({...b,user_id:user.id}).select().single();return error?NextResponse.json({error:error.message},{status:400}):NextResponse.json(data,{status:201})}
