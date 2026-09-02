import { createClient } from '@/lib/supabase/server'
import { RevisionSprintClient } from '@/components/revision/revision-sprint-client'

export default async function Page(){
  const s=await createClient()
  const [{data:docs},{count:notes},{count:cards},{count:quizzes}]=await Promise.all([
    s.from('documents').select('id,title,total_pages,reading_progress(completion_percent,last_page),document_categories(is_primary,categories(name))').order('created_at',{ascending:false}),
    s.from('keynotes').select('*',{count:'exact',head:true}),
    s.from('flashcards').select('*',{count:'exact',head:true}),
    s.from('quizzes').select('*',{count:'exact',head:true}),
  ])
  const documents=(docs||[]).map((d:any)=>{
    const p=d.reading_progress?.[0]
    const primary=(d.document_categories||[]).find((x:any)=>x.is_primary)?.categories || d.document_categories?.[0]?.categories
    return {id:d.id,title:d.title,total_pages:d.total_pages||0,category:primary?.name||'Non classé',progress:Math.round(Number(p?.completion_percent||0)),lastPage:p?.last_page||1}
  })
  return <RevisionSprintClient documents={documents} flashcards={cards||0} keynotes={notes||0} quizCount={quizzes||0}/>
}
