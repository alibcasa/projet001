import{NextResponse}from'next/server'
import{openProjectFetch}from'@/lib/integrations/openproject'
export async function GET(){try{return NextResponse.json(await openProjectFetch('/work_packages?pageSize=100'))}catch(e:any){return NextResponse.json({error:e.message},{status:500})}}
export async function POST(r:Request){try{const b=await r.json();return NextResponse.json(await openProjectFetch('/work_packages',{method:'POST',body:JSON.stringify(b)}),{status:201})}catch(e:any){return NextResponse.json({error:e.message},{status:500})}}
