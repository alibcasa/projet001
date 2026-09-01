import {NextResponse} from 'next/server'
import {createClient} from '@/lib/supabase/server'
export async function PATCH(r:Request,{params}:{params:Promise<{id:string}>}){const{id}=await params;const s=await createClient();const b=await r.json();const{data,error}=await s.from('references_library').update(b).eq('id',id).select().single();return error?NextResponse.json({error:error.message},{status:400}):NextResponse.json(data)}
export async function DELETE(_:Request,{params}:{params:Promise<{id:string}>}){const{id}=await params;const s=await createClient();const{error}=await s.from('references_library').delete().eq('id',id);return error?NextResponse.json({error:error.message},{status:400}):NextResponse.json({ok:true})}
