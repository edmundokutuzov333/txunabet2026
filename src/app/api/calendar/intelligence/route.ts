import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizationError } from '@/server/authorization';
import { getCalendarIntelligence } from '@/server/services/calendar-intelligence';

export async function GET(request: NextRequest){try{const days=Number(request.nextUrl.searchParams.get('days')??14);return NextResponse.json({data:await getCalendarIntelligence(days)})}catch(error){if(isAuthorizationError(error))return NextResponse.json({error:'Acesso não autorizado.'},{status:403});return NextResponse.json({error:error instanceof Error?error.message:'INTERNAL_ERROR'},{status:500})}}
