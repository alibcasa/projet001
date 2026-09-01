import {NextResponse} from 'next/server'
import {createClient} from '@/lib/supabase/server'
export async function GET(){const s=await createClient();const{data,error}=await s.from('references_library').select('*').order('created_at',{ascending:false});return error?NextResponse.json({error:error.message},{status:400}):NextResponse.json(data)}
export async function POST(r:Request){const s=await createClient();const{data:{user}}=await s.auth.getUser();if(!user)return NextResponse.json({error:'Unauthorized'},{status:401});const b=await r.json();const{data,error}=await s.from('references_library').insert({...b,user_id:user.id}).select().single();return error?NextResponse.json({error:error.message},{status:400}):NextResponse.json(data,{status:201})}
