import { NextResponse } from 'next/server';
import { getEnterpriseAdminSnapshot, listEnterpriseAudit } from '@/server/services/enterprise-admin';
export async function GET(){try{return NextResponse.json({overview:await getEnterpriseAdminSnapshot(),audit:await listEnterpriseAudit(50)},{headers:{'Cache-Control':'no-store'}});}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'ADMIN_CENTER_FAILED'},{status:400});}}
