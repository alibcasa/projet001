import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){const {id}=await params;const supabase=await createClient();const {data,error}=await supabase.from('quizzes').select('*, questions(*, question_choices(*))').eq('id',id).single();if(error)return NextResponse.json({error:error.message},{status:404});return NextResponse.json(data)}
