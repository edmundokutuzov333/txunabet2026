import { auth as v1Auth } from 'firebase-functions/v1';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { beforeUserCreated } from 'firebase-functions/v2/identity';
import { defineSecret } from 'firebase-functions/params';
import type { UserRecord } from 'firebase-admin/auth';
import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import { z } from 'zod';
import Stripe from 'stripe';

if (!admin.apps?.length) admin.initializeApp();
export { automationWorker, triggerAutomationEvent, runAutomationNow } from './automation-engine';
export { domainEventOutboxWorker } from './domain-event-outbox';
const db = admin.firestore();
const REGION = 'africa-south1';
const stripeApiKey = defineSecret('STRIPE_API_KEY');
const CORPORATE_DOMAIN = process.env.CORPORATE_EMAIL_DOMAIN || 'txunabet.com';

type EnterpriseRole = 'owner' | 'admin' | 'manager' | 'member' | 'viewer';
type FunctionIdentity = { uid: string; companyId: string; role: EnterpriseRole };

async function requireCompanyIdentity(request: { auth?: { uid: string; token: Record<string, unknown> } }): Promise<FunctionIdentity> {
  if (!request.auth) throw new HttpsError('unauthenticated', 'A autenticação é necessária.');
  const companyId = typeof request.auth.token.companyId === 'string' ? request.auth.token.companyId : '';
  if (!companyId) throw new HttpsError('permission-denied', 'A conta não possui uma empresa ativa.');
  const member = await db.collection('companies').doc(companyId).collection('members').doc(request.auth.uid).get();
  if (!member.exists || member.data()?.status !== 'active') throw new HttpsError('permission-denied', 'A membership empresarial não está ativa.');
  const role = member.data()?.role as EnterpriseRole;
  if (!['owner', 'admin', 'manager', 'member', 'viewer'].includes(role)) throw new HttpsError('permission-denied', 'Role empresarial inválido.');
  return { uid: request.auth.uid, companyId, role };
}

function requireMfa(request: { auth?: { token: Record<string, unknown> } }): void {
  const firebaseClaims = request.auth?.token.firebase as { sign_in_second_factor?: string } | undefined;
  if (!firebaseClaims?.sign_in_second_factor) throw new HttpsError('failed-precondition', 'A autenticação multi-fator é obrigatória para esta operação.');
}

export const beforecreate = beforeUserCreated((event) => {
  const email = event.data?.email?.trim().toLowerCase();
  if (!email) throw new HttpsError('invalid-argument', 'Um email corporativo é obrigatório.');
  const domain = email.split('@')[1];
  if (domain !== CORPORATE_DOMAIN) {
    logger.warn('Blocked non-corporate registration attempt', { email });
    throw new HttpsError('permission-denied', 'Apenas contas corporativas autorizadas podem ser registadas.');
  }
});

export const oncreate = v1Auth.user().onCreate(async (user: UserRecord) => {
  const now = admin.firestore.FieldValue.serverTimestamp();
  await db.collection('users').doc(user.uid).set({ uid: user.uid, email: user.email ?? null, displayName: user.displayName || 'Novo Utilizador', status: 'pending', mfaRequired: false, createdAt: now, updatedAt: now }, { merge: true });
  logger.info('Created pending enterprise user profile', { uid: user.uid });
});

export class StockService {
  private static instance: StockService;
  private constructor() {}
  public static getInstance(): StockService { if (!StockService.instance) StockService.instance = new StockService(); return StockService.instance; }
  async verifyStock(itemId: string, quantity: number): Promise<boolean> { const stockDatabase: Record<string, number> = { prod_abc: 10, prod_xyz: 0 }; return (stockDatabase[itemId] || 0) >= quantity; }
}

export class TaxService {
  private static instance: TaxService;
  private readonly taxRate = 0.17;
  private constructor() {}
  public static getInstance(): TaxService { if (!TaxService.instance) TaxService.instance = new TaxService(); return TaxService.instance; }
  async calculateTax(amount: number): Promise<number> { return Math.floor(amount * this.taxRate); }
}

export class OrderService {
  private static instance: OrderService;
  private stripe: Stripe;
  private stockService: StockService;
  private taxService: TaxService;
  private constructor(stripeKey: string) { this.stripe = new Stripe(stripeKey, { apiVersion: '2024-04-10', typescript: true }); this.stockService = StockService.getInstance(); this.taxService = TaxService.getInstance(); }
  public static getInstance(stripeKey: string): OrderService { if (!OrderService.instance) OrderService.instance = new OrderService(stripeKey); return OrderService.instance; }
  async processNewOrder(orderData: { itemId: string; quantity: number; amount: number; currency: 'usd' | 'brl' | 'eur'; paymentMethodId: string; customerId: string; companyId: string }) {
    const [hasStock, taxAmount] = await Promise.all([this.stockService.verifyStock(orderData.itemId, orderData.quantity), this.taxService.calculateTax(orderData.amount)]);
    if (!hasStock) throw new HttpsError('failed-precondition', `Item ${orderData.itemId} is out of stock.`);
    const totalAmount = orderData.amount + taxAmount;
    const paymentIntent = await this.stripe.paymentIntents.create({ amount: totalAmount, currency: orderData.currency, payment_method: orderData.paymentMethodId, confirm: true, automatic_payment_methods: { enabled: true, allow_redirects: 'never' }, metadata: { firebaseUid: orderData.customerId, companyId: orderData.companyId, itemId: orderData.itemId, quantity: String(orderData.quantity), tax_amount: String(taxAmount) } });
    await db.collection('transactions').doc(paymentIntent.id).set({ id: paymentIntent.id, companyId: orderData.companyId, userId: orderData.customerId, externalId: paymentIntent.id, source: 'stripe', amount: totalAmount, currency: orderData.currency, status: paymentIntent.status === 'succeeded' ? 'succeeded' : 'pending', createdAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp(), metadata: { itemId: orderData.itemId, quantity: String(orderData.quantity), taxAmount: String(taxAmount) });
    return { clientSecret: paymentIntent.client_secret, status: paymentIntent.status, totalAmount };
  }
}

const PlaceOrderSchema = z.object({ itemId: z.string().startsWith('prod_'), quantity: z.number().int().positive(), amount: z.number().int().positive().max(1_000_000), currency: z.enum(['usd', 'brl', 'eur']), paymentMethodId: z.string().startsWith('pm_') });
export const placeOrder = onCall({ secrets: [stripeApiKey], region: REGION, enforceAppCheck: true }, async (request) => {
  const identity = await requireCompanyIdentity(request); requireMfa(request); const parsed = PlaceOrderSchema.safeParse(request.data); if (!parsed.success) throw new HttpsError('invalid-argument', 'Invalid order data.');
  try { return { status: 'success', orderResult: await OrderService.getInstance(stripeApiKey.value()).processNewOrder({ ...parsed.data, customerId: identity.uid, companyId: identity.companyId }) }; }
  catch (error) { logger.error('Order processing failed', { uid: identity.uid, companyId: identity.companyId, error }); if (error instanceof HttpsError) throw error; throw new HttpsError('internal', 'The system could not complete the request.'); }
});

const PaymentSchema = z.object({ amount: z.number().int().positive().max(1_000_000), currency: z.enum(['usd', 'brl', 'eur']), paymentMethodId: z.string().startsWith('pm_') });
export const createPaymentIntent = onCall({ secrets: [stripeApiKey], region: REGION, enforceAppCheck: true }, async (request) => {
  const identity = await requireCompanyIdentity(request); requireMfa(request); const parsed = PaymentSchema.safeParse(request.data); if (!parsed.success) throw new HttpsError('invalid-argument', 'Dados de pagamento inválidos.');
  try { const stripe = new Stripe(stripeApiKey.value(), { apiVersion: '2024-04-10', typescript: true }); const paymentIntent = await stripe.paymentIntents.create({ amount: parsed.data.amount, currency: parsed.data.currency, payment_method: parsed.data.paymentMethodId, confirm: true, automatic_payment_methods: { enabled: true, allow_redirects: 'never' }, metadata: { firebaseUid: identity.uid, companyId: identity.companyId } }); await db.collection('transactions').doc(paymentIntent.id).set({ id: paymentIntent.id, companyId: identity.companyId, userId: identity.uid, externalId: paymentIntent.id, source: 'stripe', amount: parsed.data.amount, currency: parsed.data.currency, status: paymentIntent.status === 'succeeded' ? 'succeeded' : 'pending', createdAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp(), metadata: {} }); return { success: true, clientSecret: paymentIntent.client_secret, status: paymentIntent.status }; }
  catch (error) { logger.error('Payment intent creation failed', { uid: identity.uid, companyId: identity.companyId, error }); throw new HttpsError('aborted', 'Falha no processamento do pagamento.'); }
});

export const setAdminRole = onCall({ region: REGION }, async (request) => {
  const caller = await requireCompanyIdentity(request); requireMfa(request); if (!['owner', 'admin'].includes(caller.role)) throw new HttpsError('permission-denied', 'Only enterprise administrators can change roles.');
  const schema = z.object({ uid: z.string().min(1).max(128), companyId: z.string().min(1).max(128), role: z.enum(['owner', 'admin', 'manager', 'member', 'viewer']) }); const parsed = schema.safeParse(request.data); if (!parsed.success) throw new HttpsError('invalid-argument', 'Dados de membership inválidos.'); if (parsed.data.companyId !== caller.companyId) throw new HttpsError('permission-denied', 'Cannot manage another company.');
  const memberRef = db.collection('companies').doc(caller.companyId).collection('members').doc(parsed.data.uid); await memberRef.set({ userId: parsed.data.uid, companyId: caller.companyId, role: parsed.data.role, permissions: [], departmentIds: [], status: 'active', updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
  const target = await admin.auth().getUser(parsed.data.uid); await admin.auth().setCustomUserClaims(parsed.data.uid, { ...(target.customClaims ?? {}), role: parsed.data.role, companyId: caller.companyId }); await admin.auth().revokeRefreshTokens(parsed.data.uid);
  await db.collection('companies').doc(caller.companyId).collection('auditLogs').add({ companyId: caller.companyId, actorId: caller.uid, action: 'membership.role_changed', resourceType: 'membership', resourceId: parsed.data.uid, metadata: { role: parsed.data.role }, createdAt: admin.firestore.FieldValue.serverTimestamp() }); return { ok: true };
});
