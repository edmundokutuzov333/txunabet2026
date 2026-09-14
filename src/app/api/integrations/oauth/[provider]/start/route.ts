import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { createOAuthState, type IntegrationProvider } from '@/server/services/integration-platform';

export const runtime='nodejs';
export async function GET(request:NextRequest,context:{params:Promise<{provider:string}>}){try{const{provider}=await context.params;const redirect=request.nextUrl.searchParams.get('redirect');if(!redirect)throw new Error('REDIRECT_URI_REQUIRED');const verifier=crypto.randomBytes(32).toString('base64url');const result=await createOAuthState(provider as IntegrationProvider,redirect,verifier);return NextResponse.redirect(result.url);}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'OAUTH_START_FAILED'},{status:400});}}
