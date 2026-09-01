import{NextResponse}from'next/server';import{microsoftAuthUrl}from'@/lib/integrations/oauth';export async function GET(r:Request){return NextResponse.redirect(microsoftAuthUrl(r))}
