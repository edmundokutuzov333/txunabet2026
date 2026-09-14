import 'server-only';

import { Timestamp } from 'firebase-admin/firestore';
import { getAdminDb } from '@/server/firebase/admin';
import { requireIdentity, requirePermission } from '@/server/authorization';
import { PERMISSIONS } from '@/server/authorization/permissions';

export type CalendarConflict={kind:'overlap'|'deadline-risk'|'focus-collision';severity:'high'|'medium'|'low';title:string;startsAt?:string;endsAt?:string;items:string[];reason:string};

function millis(value:unknown):number{if(value instanceof Timestamp)return value.toMillis();if(typeof value==='string'){const n=Date.parse(value);return Number.isNaN(n)?0:n}return 0;}
function iso(value:unknown):string|undefined{const n=millis(value);return n?new Date(n).toISOString():undefined;}
function duration(item:Record<string,unknown>):number{const start=millis(item.startsAt??item.startAt??item.dueDate);const end=millis(item.endsAt??item.endAt);return end>start?end-start:60*60*1000;}

export async function getCalendarIntelligence(windowDays=14){
  const identity=await requirePermission(PERMISSIONS.OPERATIONS_READ); const db=getAdminDb(); const now=Date.now(); const horizon=now+Math.min(Math.max(windowDays,1),60)*24*60*60*1000;
  const [events,meetings,tasks,projects]=await Promise.all([
    db.collection('module_calendar_events').where('companyId','==',identity.companyId).limit(300).get(),
    db.collection('module_meetings').where('companyId','==',identity.companyId).limit(200).get(),
    db.collection('module_tasks').where('companyId','==',identity.companyId).limit(300).get(),
    db.collection('projects').where('companyId','==',identity.companyId).limit(200).get(),
  ]);
  const mapped:Array<Record<string,unknown>>=[];
  events.docs.forEach(doc=>{const d=doc.data();const start=millis(d.startsAt??d.startAt??d.date);if(start>=now-24*60*60*1000&&start<=horizon)mapped.push({id:doc.id,type:'event',title:String(d.title??d.name??'Evento'),start,end:millis(d.endsAt??d.endAt)||start+duration(d),data:d})});
  meetings.docs.forEach(doc=>{const d=doc.data();const start=millis(d.startsAt??d.startAt??d.date);if(start>=now-24*60*60*1000&&start<=horizon)mapped.push({id:doc.id,type:'meeting',title:String(d.title??'Reunião'),start,end:millis(d.endsAt??d.endAt)||start+duration(d),data:d})});
  const deadlineItems:Array<Record<string,unknown>>=[]; tasks.docs.forEach(doc=>{const d=doc.data();const due=millis(d.dueDate??d.deadline);if(due>=now&&due<=horizon&&['done','completed','cancelled'].indexOf(String(d.status??''))<0)deadlineItems.push({id:doc.id,type:'task',title:String(d.title??'Tarefa'),due,projectId:d.projectId,assigneeId:d.assigneeId})});
  const conflicts:CalendarConflict[]=[];
  for(let i=0;i<mapped.length;i+=1)for(let j=i+1;j<mapped.length;j+=1){const a=mapped[i];const b=mapped[j];if(Number(a.start)<Number(b.end)&&Number(b.start)<Number(a.end)){const severity=Math.min(Number(a.end),Number(b.end))-Math.max(Number(a.start),Number(b.start))>=30*60*1000?'high':'medium';conflicts.push({kind:'overlap',severity:titleSeverity(severity),title:`Conflito: ${String(a.title)} × ${String(b.title)}`,startsAt:iso(Math.max(Number(a.start),Number(b.start))),endsAt:iso(Math.min(Number(a.end),Number(b.end))),items:[`${String(a.type)}:${String(a.id)}`,`${String(b.type)}:${String(b.id)}`],reason:'Os intervalos de calendário sobrepõem-se.'})}}
  const workload=new Map<string,{count:number;due:number}>(); for(const item of deadlineItems){const uid=typeof item.assigneeId==='string'?item.assigneeId:'unassigned';const current=workload.get(uid)??{count:0,due:0};current.count+=1;current.due+=1;workload.set(uid,current)}
  for(const [uid,value] of workload){if(value.count>=6)conflicts.push({kind:'deadline-risk',severity:'medium',title:`Alta concentração de deadlines`,items:[uid],reason:`${value.count} tarefas abertas vencem no período analisado.`})}
  return {windowDays,events:mapped.sort((a,b)=>Number(a.start)-Number(b.start)).map(item=>({id:item.id,type:item.type,title:item.title,startsAt:iso(item.start),endsAt:iso(item.end)})),deadlines:deadlineItems.sort((a,b)=>Number(a.due)-Number(b.due)).map(item=>({id:item.id,title:item.title,dueDate:iso(item.due),projectId:item.projectId,assigneeId:item.assigneeId})),projects:projects.docs.map(doc=>({id:doc.id,title:String(doc.data().title??doc.data().name??'Projeto'),deadline:iso(doc.data().deadline??doc.data().dueDate),status:doc.data().status})),conflicts,focusBlocks:buildFocusBlocks(mapped,now,horizon)};
}
function titleSeverity(overlap:number):CalendarConflict['severity']{return overlap>=60*60*1000?'high':'medium';}
function buildFocusBlocks(items:Array<Record<string,unknown>>,now:number,horizon:number){const sorted=items.filter(i=>Number(i.start)>=now&&Number(i.start)<=horizon).sort((a,b)=>Number(a.start)-Number(b.start));const blocks:Array<{start:string;end:string;minutes:number}>=[];let cursor=now;for(const item of sorted){const start=Number(item.start);if(start-cursor>=90*60*1000)blocks.push({start:new Date(cursor).toISOString(),end:new Date(start).toISOString(),minutes:Math.floor((start-cursor)/60000)});cursor=Math.max(cursor,Number(item.end));}if(horizon-cursor>=90*60*1000)blocks.push({start:new Date(cursor).toISOString(),end:new Date(Math.min(cursor+120*60*1000,horizon)).toISOString(),minutes:Math.floor(Math.min(120*60*1000,horizon-cursor)/60000)});return blocks.slice(0,8);}
