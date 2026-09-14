import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizationError } from '@/server/authorization';
import { createForm, getForm, listForms, listSubmissions, submitForm, updateForm } from '@/server/services/forms';

function errorResponse(error: unknown){
  if(isAuthorizationError(error)) return NextResponse.json({error:'Acesso não autorizado.'},{status:403});
  const code=error instanceof Error?error.message:'INTERNAL_ERROR';
  const bad=['INVALID_FORM','INVALID_ID','INVALID_RECORD_COLLECTION']; const notFound=['FORM_NOT_FOUND'];
  const status=bad.includes(code)||code.startsWith('FIELD_')?400:notFound.includes(code)?404:500;
  return NextResponse.json({error:code},{status});
}
export async function GET(request:NextRequest){try{const resource=request.nextUrl.searchParams.get('resource')??'forms'; if(resource==='forms') return NextResponse.json({data:await listForms()}); const id=request.nextUrl.searchParams.get('formId'); if(!id) return NextResponse.json({error:'FORM_ID_REQUIRED'},{status:400}); if(resource==='form') return NextResponse.json({data:await getForm(id)}); if(resource==='submissions') return NextResponse.json({data:await listSubmissions(id)}); return NextResponse.json({error:'INVALID_RESOURCE'},{status:400});}catch(e){return errorResponse(e)}}
export async function POST(request:NextRequest){try{const body=await request.json() as Record<string,unknown>; const action=String(body.action??''); if(action==='create') return NextResponse.json({data:await createForm(body.input)},{status:201}); if(action==='update') return NextResponse.json({data:await updateForm(String(body.formId??''),body.input)}); if(action==='submit') return NextResponse.json({data:await submitForm(String(body.formId??''),(body.values&&typeof body.values==='object'&&!Array.isArray(body.values))?body.values as Record<string,unknown>: {})},{status:201}); return NextResponse.json({error:'INVALID_ACTION'},{status:400});}catch(e){return errorResponse(e)}}
