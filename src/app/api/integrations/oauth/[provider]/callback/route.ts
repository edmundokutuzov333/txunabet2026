import { NextRequest, NextResponse } from 'next/server';
import { exchangeOAuthCode, type IntegrationProvider } from '@/server/services/integration-platform';
export const runtime='nodejs';
export async function GET(request:NextRequest,context:{params:Promise<{provider:string}>}){try{const{provider}=await context.params;const code=request.nextUrl.searchParams.get('code');const state=request.nextUrl.searchParams.get('state');if(!code||!state)throw new Error('OAUTH_CALLBACK_INVALID');const result=await exchangeOAuthCode(provider as IntegrationProvider,state,code);return NextResponse.json(result,{headers:{'Cache-Control':'no-store'}});}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'OAUTH_CALLBACK_FAILED'},{status:400});}}
