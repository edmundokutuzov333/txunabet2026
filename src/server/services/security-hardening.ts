import 'server-only';
import crypto from 'node:crypto';

export function assertSafeOutboundUrl(value:string):URL{let url:URL;try{url=new URL(value);}catch{throw new Error('INVALID_URL');}if(url.protocol!=='https:')throw new Error('HTTPS_REQUIRED');const host=url.hostname.toLowerCase();if(['localhost','127.0.0.1','0.0.0.0','::1','169.254.169.254'].includes(host)||host.endsWith('.localhost')||host.endsWith('.internal')||/^10\./.test(host)||/^192\.168\./.test(host)||/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)||host.startsWith('fc')||host.startsWith('fe80'))throw new Error('SSRF_BLOCKED');return url;}
export function signWebhook(secret:string,timestamp:string,body:string):string{return crypto.createHmac('sha256',secret).update(`${timestamp}.${body}`).digest('hex');}
export function verifyWebhookSignature(secret:string,timestamp:string,body:string,signature:string,maxAgeSeconds=300):boolean{const ts=Number(timestamp);if(!Number.isFinite(ts)||Math.abs(Date.now()/1000-ts)>maxAgeSeconds)return false;const expected=signWebhook(secret,timestamp,body);const a=Buffer.from(expected,'utf8'),b=Buffer.from(signature,'utf8');return a.length===b.length&&crypto.timingSafeEqual(a,b);}
export function safeFileName(value:string):string{const name=value.replace(/[^A-Za-z0-9._-]/g,'_').slice(0,180);if(!name||name==='.'||name==='..')throw new Error('INVALID_FILENAME');return name;}
export function sanitizeRedirectUri(value:string):string{const url=assertSafeOutboundUrl(value);return url.toString();}
