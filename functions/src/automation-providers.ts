import * as logger from 'firebase-functions/logger';

type Data=Record<string,unknown>;

async function readJson(response:Response){
  const text=await response.text();
  let data:unknown=null;
  try{data=text?JSON.parse(text):null;}catch{data={raw:text.slice(0,4000)};}
  if(!response.ok){
    const message=data&&typeof data==='object'&&'message' in data?String((data as Data).message):`Provider HTTP ${response.status}`;
    throw new Error(message.slice(0,500));
  }
  return data;
}

function normalizeRecipients(value:unknown){
  const values=Array.isArray(value)?value:[value];
  return values.map(String).map(v=>v.trim()).filter(Boolean);
}

export async function sendEmail(apiKey:string,input:{to:unknown;subject:unknown;html?:unknown;text?:unknown;from?:unknown;replyTo?:unknown;headers?:unknown;idempotencyKey:string}){
  if(!apiKey)throw new Error('RESEND_API_KEY_NOT_CONFIGURED');
  const to=normalizeRecipients(input.to);
  if(to.length===0)throw new Error('EMAIL_RECIPIENT_REQUIRED');
  const subject=String(input.subject??'').trim();
  if(!subject)throw new Error('EMAIL_SUBJECT_REQUIRED');
  const from=String(input.from??process.env.AUTOMATION_EMAIL_FROM??'onboarding@resend.dev').trim();
  const body:Data={from,to,subject};
  if(input.html!==undefined)body.html=String(input.html);
  if(input.text!==undefined)body.text=String(input.text);
  if(input.replyTo)body.reply_to=normalizeRecipients(input.replyTo);
  if(input.headers&&typeof input.headers==='object'&&!Array.isArray(input.headers))body.headers=input.headers;
  if(!body.html&&!body.text)body.text='';
  const response=await fetch('https://api.resend.com/emails',{
    method:'POST',
    headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json','Idempotency-Key':input.idempotencyKey},
    body:JSON.stringify(body),
    signal:AbortSignal.timeout(20000),
  });
  const data=await readJson(response) as Data;
  logger.info('Automation email sent',{provider:'resend',id:data.id??null,to:to.length,idempotencyKey:input.idempotencyKey});
  return {provider:'resend',id:String(data.id??''),to,subject};
}

export async function generateGemini(apiKey:string,input:{prompt:string;model?:unknown;systemInstruction?:unknown;temperature?:unknown;maxOutputTokens?:unknown;responseMimeType?:unknown}):Promise<Data>{
  if(!apiKey)throw new Error('GEMINI_API_KEY_NOT_CONFIGURED');
  const model=String(input.model??process.env.GEMINI_MODEL??'gemini-3.8-flash').replace(/^models\//,'');
  const prompt=input.prompt.trim();
  if(!prompt)throw new Error('AI_PROMPT_REQUIRED');
  const generationConfig:Data={};
  if(input.temperature!==undefined)generationConfig.temperature=Math.max(0,Math.min(2,Number(input.temperature)));
  if(input.maxOutputTokens!==undefined)generationConfig.maxOutputTokens=Math.max(1,Math.min(65536,Math.floor(Number(input.maxOutputTokens))));
  if(input.responseMimeType)generationConfig.responseMimeType=String(input.responseMimeType);
  const request:Data={contents:[{role:'user',parts:[{text:prompt}]}]};
  if(input.systemInstruction)request.systemInstruction={parts:[{text:String(input.systemInstruction)}]};
  if(Object.keys(generationConfig).length)request.generationConfig=generationConfig;
  const endpoint=`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(request),signal:AbortSignal.timeout(60000)});
  const data=await readJson(response) as Data;
  const candidates=Array.isArray(data.candidates)?data.candidates:[];
  const first=candidates[0]&&typeof candidates[0]==='object'?candidates[0] as Data:{};
  const content=first.content&&typeof first.content==='object'?first.content as Data:{};
  const parts=Array.isArray(content.parts)?content.parts:[];
  const text=parts.filter(part=>part&&typeof part==='object'&&typeof (part as Data).text==='string').map(part=>String((part as Data).text)).join('');
  if(!text&&String((first.finishReason??'')).toUpperCase()==='SAFETY')throw new Error('AI_RESPONSE_BLOCKED');
  return {provider:'gemini',model,text,candidatesCount:candidates.length,usageMetadata:data.usageMetadata??null,raw:data};
}
