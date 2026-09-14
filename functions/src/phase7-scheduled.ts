import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';

const REGION='africa-south1';
export const phase7ObservabilitySweep=onSchedule({schedule:'every 5 minutes',timeZone:'Africa/Maputo',region:REGION},async()=>{const db=admin.firestore();const snapshot=await db.collectionGroup('automation_jobs').where('status','==','pending').limit(500).get();const byCompany=new Map<string,number>();for(const d of snapshot.docs){const c=d.data().companyId;if(typeof c==='string')byCompany.set(c,(byCompany.get(c)??0)+1);}const batch=db.batch();for(const [companyId,depth] of byCompany){batch.set(db.collection('observability_metrics').doc(),{companyId,name:'queue_depth',value:depth,component:'automation',success:true,timestamp:new Date().toISOString(),createdAt:admin.firestore.Timestamp.now()});}if(byCompany.size)await batch.commit();logger.info('Phase 7 observability sweep completed',{companies:byCompany.size});});

export const phase7IntegrationSyncSweep=onSchedule({schedule:'every 15 minutes',timeZone:'Africa/Maputo',region:REGION},async()=>{const db=admin.firestore();const snapshot=await db.collection('integration_sync_jobs').where('status','==','pending').where('nextAttemptAt','<=',admin.firestore.Timestamp.now()).limit(100).get();for(const d of snapshot.docs){await d.ref.update({status:'queued',queuedAt:admin.firestore.Timestamp.now(),updatedAt:admin.firestore.Timestamp.now()});}logger.info('Phase 7 integration sync sweep completed',{queued:snapshot.size});});

export const phase7AlertSweep=onSchedule({schedule:'every 10 minutes',timeZone:'Africa/Maputo',region:REGION},async()=>{const db=admin.firestore();const alerts=await db.collectionGroup('observability_alerts').where('active','==',true).limit(200).get();logger.info('Phase 7 alert sweep completed',{alerts:alerts.size});});
