import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { listMarketplaceTemplates, installMarketplaceTemplate } from '@/server/services/marketplace';
const schema=z.object({templateId:z.string().regex(/^[A-Za-z0-9_-]{1,120}$/)});
export async function GET(){return NextResponse.json({templates:listMarketplaceTemplates()},{headers:{'Cache-Control':'no-store'}});}
export async function POST(req:NextRequest){try{const{templateId}=schema.parse(await req.json());return NextResponse.json(await installMarketplaceTemplate(templateId),{status:201});}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'MARKETPLACE_FAILED'},{status:400});}}
