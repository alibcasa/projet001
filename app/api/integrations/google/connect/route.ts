import{NextResponse}from'next/server';import{googleAuthUrl}from'@/lib/integrations/oauth';export async function GET(r:Request){return NextResponse.redirect(googleAuthUrl(r))}
