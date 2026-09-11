import { auth as v1Auth } from 'firebase-functions/v1';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { beforeUserCreated } from 'firebase-functions/v2/identity';
import { defineSecret } from 'firebase-functions/params';
import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import { z } from 'zod';
import Stripe from 'stripe';

admin.initializeApp();
const db = admin.firestore();
const REGION = 'africa-south1';
const stripeApiKey = defineSecret('STRIPE_API_KEY');

const CORPORATE_DOMAIN = process.env.CORPORATE_EMAIL_DOMAIN || 'txunabet.com';

export const beforecreate = beforeUserCreated(
  { region: REGION, cpu: 1, memory: '256MiB', concurrency: 80 },
  (event) => {
    const email = event.data?.email?.trim().toLowerCase();
    if (!email) throw new HttpsError('invalid-argument', 'Um email corporativo é obrigatório.');

    const domain = email.split('@')[1];
    if (domain !== CORPORATE_DOMAIN) {
      logger.warn('Blocked non-corporate registration attempt', { email });
      throw new HttpsError('permission-denied', 'Apenas contas corporativas autorizadas podem ser registadas.');
    }
  }
);

export const oncreate = v1Auth.user().onCreate(
  { region: REGION },
  async (user) => {
    const now = admin.firestore.FieldValue.serverTimestamp();
    await db.collection('users').doc(user.uid).set({
      uid: user.uid,
      email: user.email ?? null,
      displayName: user.displayName || 'Novo Utilizador',
      status: 'pending',
      mfaRequired: false,
      createdAt: now,
      updatedAt: now,
    }, { merge: true });

    logger.info('Created pending enterprise user profile', { uid: user.uid });
  }
);

export class StockService {
  private static instance: StockService;
  private constructor() {}
  public static getInstance(): StockService {
    if (!StockService.instance) StockService.instance = new StockService();
    return StockService.instance;
  }
  async verifyStock(itemId: string, quantity: number): Promise<boolean> {
    const stockDatabase: Record<string, number> = { prod_abc: 10, prod_xyz: 0 };
    return (stockDatabase[itemId] || 0) >= quantity;
  }
}

export class TaxService {
  private static instance: TaxService;
  private readonly taxRate = 0.17;
  private constructor() {}
  public static getInstance(): TaxService {
    if (!TaxService.instance) TaxService.instance = new TaxService();
    return TaxService.instance;
  }
  async calculateTax(amount: number): Promise<number> {
    return Math.floor(amount * this.taxRate);
  }
}

export class OrderService {
  private static instance: OrderService;
  private stripe: Stripe;
  private stockService: StockService;
  private taxService: TaxService;

  private constructor(stripeKey: string) {
    this.stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20', typescript: true });
    this.stockService = StockService.getInstance();
    this.taxService = TaxService.getInstance();
  }

  public static getInstance(stripeKey: string): OrderService {
    if (!OrderService.instance) OrderService.instance = new OrderService(stripeKey);
    return OrderService.instance;
  }

  async processNewOrder(orderData: {
    itemId: string;
    quantity: number;
    amount: number;
    currency: 'usd' | 'brl' | 'eur';
    paymentMethodId: string;
    customerId: string;
  }) {
    const [hasStock, taxAmount] = await Promise.all([
      this.stockService.verifyStock(orderData.itemId, orderData.quantity),
      this.taxService.calculateTax(orderData.amount),
    ]);

    if (!hasStock) throw new HttpsError('failed-precondition', `Item ${orderData.itemId} is out of stock.`);

    const totalAmount = orderData.amount + taxAmount;
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: totalAmount,
      currency: orderData.currency,
      payment_method: orderData.paymentMethodId,
      customer: orderData.customerId,
      confirm: true,
      automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
      metadata: {
        itemId: orderData.itemId,
        quantity: String(orderData.quantity),
        tax_amount: String(taxAmount),
      },
    });

    return {
      clientSecret: paymentIntent.client_secret,
      status: paymentIntent.status,
      totalAmount,
    };
  }
}

const PlaceOrderSchema = z.object({
  itemId: z.string().startsWith('prod_'),
  quantity: z.number().int().positive(),
  amount: z.number().int().positive().max(1_000_000),
  currency: z.enum(['usd', 'brl', 'eur']),
  paymentMethodId: z.string().startsWith('pm_'),
});

export const placeOrder = onCall(
  { secrets: [stripeApiKey], region: REGION, enforceAppCheck: true },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication is required.');
    const parsed = PlaceOrderSchema.safeParse(request.data);
    if (!parsed.success) throw new HttpsError('invalid-argument', 'Invalid order data.');

    try {
      return {
        status: 'success',
        orderResult: await OrderService.getInstance(stripeApiKey.value()).processNewOrder({
          ...parsed.data,
          customerId: request.auth.uid,
        }),
      };
    } catch (error) {
      logger.error('Order processing failed', { uid: request.auth.uid, error });
      if (error instanceof HttpsError) throw error;
      throw new HttpsError('internal', 'The system could not complete the request.');
    }
  }
);

const PaymentSchema = z.object({
  amount: z.number().int().positive().max(1_000_000),
  currency: z.enum(['usd', 'brl', 'eur']),
  paymentMethodId: z.string().startsWith('pm_'),
});

export const createPaymentIntent = onCall(
  { secrets: [stripeApiKey], region: REGION, enforceAppCheck: true },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'A autenticação é necessária.');
    const parsed = PaymentSchema.safeParse(request.data);
    if (!parsed.success) throw new HttpsError('invalid-argument', 'Dados de pagamento inválidos.');

    try {
      const stripe = new Stripe(stripeApiKey.value(), { apiVersion: '2024-06-20', typescript: true });
      const paymentIntent = await stripe.paymentIntents.create({
        amount: parsed.data.amount,
        currency: parsed.data.currency,
        payment_method: parsed.data.paymentMethodId,
        customer: request.auth.uid,
        confirm: true,
        automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
        metadata: { firebaseUid: request.auth.uid },
      });
      return { success: true, clientSecret: paymentIntent.client_secret, status: paymentIntent.status };
    } catch (error) {
      logger.error('Payment intent creation failed', { uid: request.auth.uid, error });
      throw new HttpsError('aborted', 'Falha no processamento do pagamento.');
    }
  }
);

export const setAdminRole = onCall({ region: REGION }, async (request) => {
  if (!request.auth || !['owner', 'admin'].includes(String(request.auth.token.role))) {
    throw new HttpsError('permission-denied', 'Only an existing enterprise administrator can change roles.');
  }

  const schema = z.object({ uid: z.string().min(1).max(128), companyId: z.string().min(1).max(128), role: z.enum(['owner', 'admin', 'manager', 'member', 'viewer']) });
  const parsed = schema.safeParse(request.data);
  if (!parsed.success) throw new HttpsError('invalid-argument', 'Dados de membership inválidos.');

  const memberRef = db.collection('companies').doc(parsed.data.companyId).collection('members').doc(parsed.data.uid);
  await memberRef.set({
    userId: parsed.data.uid,
    companyId: parsed.data.companyId,
    role: parsed.data.role,
    permissions: [],
    departmentIds: [],
    status: 'active',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  await admin.auth().setCustomUserClaims(parsed.data.uid, {
    ...(await admin.auth().getUser(parsed.data.uid)).customClaims,
    role: parsed.data.role,
    companyId: parsed.data.companyId,
  });
  await admin.auth().revokeRefreshTokens(parsed.data.uid);

  await db.collection('companies').doc(parsed.data.companyId).collection('auditLogs').add({
    companyId: parsed.data.companyId,
    actorId: request.auth.uid,
    action: 'membership.role_changed',
    resourceType: 'membership',
    resourceId: parsed.data.uid,
    metadata: { role: parsed.data.role },
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { ok: true };
});
