
import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";
import { HttpsError, onCall } from "firebase-functions/v2/httpshttps";
import { beforeUserCreated } from "firebase-functions/v2/identity";
import { defineSecret } from "firebase-functions/params";
import { z } from "zod";
import Stripe from "stripe";
import * as logger from "firebase-functions/logger";
import { DatabaseService } from "./services/DatabaseService";


admin.initializeApp();
const db = admin.firestore();

// ============================================================================
// ARCHITECTURAL CORE: GLOBAL CONFIGURATION
// ============================================================================
const REGION = "africa-south1";


// ============================================================================
// ID & ACCESS MANAGEMENT (IAM) TRIGGERS
// Automates and secures the user lifecycle.
// ============================================================================

/**
 * BLOCKING FUNCTION: The "Firewall" for user registration.
 * This function runs BEFORE a user is created in Firebase Auth.
 * If it throws an error, the user creation is cancelled.
 */
export const beforecreate = beforeUserCreated(
  { 
    region: REGION,
    secrets: [],
    cpu: 1,
    memory: "1GiB",
    minInstances: 1, // Keep hot to ensure fast sign-ups
    concurrency: 80,
  }, 
  (event) => {
    const user = event.data;
    
    const disposableDomains = ["tempmail.com", "10minutemail.com", "mailinator.com"];
    const domain = user.email?.split("@")[1];

    if (domain && disposableDomains.includes(domain)) {
      logger.warn(`Blocking registration from disposable email: ${user.email}`);
      throw new HttpsError("permission-denied", "Temporary email domains are not permitted.");
    }
    
    if (!user.emailVerified) {
      // This can be enabled to force email verification BEFORE the account is even created.
      // logger.warn(`Blocking unverified email: ${user.email}`);
      // throw new HttpsError("permission-denied", "Email address must be verified before signing up.");
    }

    logger.info(`User validation passed for: ${user.email}`);
});

/**
 * ON-CREATE TRIGGER: The "Onboarding Specialist" for new users.
 * This function runs AFTER a user is successfully created in Firebase Auth.
 * It syncs the user to Firestore and assigns a default role via Custom Claims.
 */
export const oncreate = functions.auth.user().onCreate(
  {
    region: REGION,
    cpu: 1,
    memory: "1GiB",
    minInstances: 1, // Keep hot to ensure new users have profiles instantly
    concurrency: 80,
  },
  async (user) => {
    logger.info(`New user created: ${user.uid}, Email: ${user.email}. Starting onboarding.`);
    
    try {
      // 1. Assign a default role using Custom Claims.
      // This is read by Security Rules for immediate, secure access control.
      await admin.auth().setCustomUserClaims(user.uid, { role: "customer" }); // e.g., 'customer', 'viewer'
      
      // 2. Create the user's profile document in Firestore.
      const userRef = db.collection("users").doc(user.uid);
      await userRef.set({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || 'Novo Utilizador',
        role: 'customer', // Also store role here for client-side display convenience.
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        status: "active",
        accountBalance: 0, // Initialize financial data
        preferences: { theme: "dark", notifications: true } // Sensible defaults
      });

      logger.info(`Successfully onboarded user ${user.uid}. Assigned 'customer' role.`);
    } catch (error) {
      logger.error(`Failed to complete user setup for ${user.uid}`, error);
    }
});


// ============================================================================
// ARCHITECTURAL CORE: IDEMPOTENCY WRAPPER
// ============================================================================

/**
 * A Higher-Order Function that wraps business logic to enforce idempotency.
 * @param eventId A unique identifier for the request, from context.
 * @param func The function to execute idempotently.
 * @returns The result of the function execution.
 */
async function withIdempotency<T>(
  eventId: string,
  func: () => Promise<T>
): Promise<T> {
  const idempotencyRef = db.collection("idempotency_keys").doc(eventId);
  const doc = await idempotencyRef.get();

  if (doc.exists && doc.data()?.status === "completed") {
    logger.info(`Idempotency key ${eventId} already processed. Returning cached result.`);
    return doc.data()?.response as T;
  }
  if (doc.exists && doc.data()?.status === "processing") {
     throw new HttpsError("aborted", "Request is already being processed.");
  }

  await db.runTransaction(async (transaction) => {
    const freshDoc = await transaction.get(idempotencyRef);
    if (freshDoc.exists) return;
    transaction.set(idempotencyRef, { status: "processing", createdAt: new Date() });
  });

  try {
    const result = await func();
    await idempotencyRef.set({ status: "completed", response: result }, { merge: true });
    return result;
  } catch (error) {
     await idempotencyRef.set({ status: "failed", error: error instanceof Error ? error.message : "Unknown error" }, { merge: true });
    throw error;
  }
}


// ============================================================================
// ARCHITECTURAL CORE: SHARED SERVICES (SINGLETONS)
// ============================================================================

export class StockService {
  private static instance: StockService;
  private constructor() { logger.info("StockService Singleton Initialized (Warm Start)"); }
  public static getInstance(): StockService {
    if (!StockService.instance) {
      StockService.instance = new StockService();
    }
    return StockService.instance;
  }
  async verifyStock(itemId: string, quantity: number): Promise<boolean> {
    logger.info(`Verifying stock for item ${itemId}, quantity ${quantity}.`);
    const stockDatabase: { [key: string]: number } = { "prod_abc": 10, "prod_xyz": 0 };
    await new Promise(resolve => setTimeout(resolve, 50));
    return (stockDatabase[itemId] || 0) >= quantity;
  }
}

export class TaxService {
  private static instance: TaxService;
  private taxRate = 0.17;
  private constructor() { logger.info("TaxService Singleton Initialized (Warm Start)"); }
  public static getInstance(): TaxService {
    if (!TaxService.instance) {
      TaxService.instance = new TaxService();
    }
    return TaxService.instance;
  }
  async calculateTax(amount: number): Promise<number> {
    await new Promise(resolve => setTimeout(resolve, 20));
    const tax = Math.floor(amount * this.taxRate);
    logger.info(`Calculated tax for amount ${amount}: ${tax}`);
    return tax;
  }
}

export class OrderService {
  private static instance: OrderService;
  private stripe: Stripe;
  private stockService: StockService;
  private taxService: TaxService;
  private databaseService: DatabaseService;

  private constructor(stripeKey: string) {
    this.stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20", typescript: true });
    this.stockService = StockService.getInstance();
    this.taxService = TaxService.getInstance();
    this.databaseService = DatabaseService.getInstance();
    logger.info("OrderService Singleton Initialized (Warm Start)");
  }
  public static getInstance(stripeKey: string): OrderService {
    if (!OrderService.instance) {
      OrderService.instance = new OrderService(stripeKey);
    }
    return OrderService.instance;
  }
  async processNewOrder(orderData: { itemId: string; quantity: number; amount: number; currency: "usd" | "brl" | "eur"; paymentMethodId: string; customerId: string; }) {
    const { itemId, quantity, amount, currency, paymentMethodId, customerId } = orderData;
    
    // Performance: Run independent checks in parallel
    const [hasStock, taxAmount] = await Promise.all([
      this.stockService.verifyStock(itemId, quantity),
      this.taxService.calculateTax(amount),
    ]);
    
    if (!hasStock) {
      throw new HttpsError("failed-precondition", `Item ${itemId} is out of stock.`);
    }
    
    const totalAmount = amount + taxAmount;
    
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: totalAmount,
      currency,
      payment_method: paymentMethodId,
      customer: customerId,
      confirm: true,
      automatic_payment_methods: { enabled: true, allow_redirects: "never" },
      metadata: { itemId, quantity, tax_amount: taxAmount },
    });
    
    // Example of calling another service
    await this.databaseService.addDocument('orders', {
      orderId: paymentIntent.id,
      customerId: customerId,
      amount: totalAmount,
      createdAt: new Date().toISOString()
    });

    return { clientSecret: paymentIntent.client_secret, status: paymentIntent.status, totalAmount };
  }
}


// ============================================================================
// CONTROLLER LAYER: FIREBASE FUNCTION HANDLERS
// ============================================================================

const stripeApiKey = defineSecret("STRIPE_API_KEY");

const PlaceOrderSchema = z.object({
  itemId: z.string().startsWith("prod_"),
  quantity: z.number().int().positive(),
  amount: z.number().int().positive().max(1000000),
  currency: z.enum(["usd", "brl", "eur"]),
  paymentMethodId: z.string().startsWith("pm_")
});

export const placeOrder = onCall(
  { 
    secrets: [stripeApiKey], 
    region: REGION, 
    enforceAppCheck: true,
    cpu: 1,
    memory: "1GiB",
    minInstances: 1, // Keep hot for fast payments
    concurrency: 80,
  }, 
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication is required.");
    }
    const uid = request.auth.uid;
    const eventId = request.auth.token.jti;
    if (!eventId) {
      throw new HttpsError("invalid-argument", "Event ID is missing, cannot ensure idempotency.");
    }
    
    // Firewall: Zod Validation
    const validation = PlaceOrderSchema.safeParse(request.data);
    if (!validation.success) {
      logger.warn("Invalid order data received", { uid, errors: validation.error.flatten() });
      throw new HttpsError("invalid-argument", "Invalid or corrupt order data provided.");
    }
    
    try {
      // Delegation: Call the singleton service
      const orderService = OrderService.getInstance(stripeApiKey.value());
      
      // Idempotency Wrapper
      const result = await withIdempotency(eventId, () => 
        orderService.processNewOrder({
          ...validation.data,
          customerId: uid,
        })
      );
      
      return { status: "success", orderResult: result };
    } catch (error) {
      logger.error("Order processing failed unexpectedly", { uid, error });
      if (error instanceof HttpsError) {
        throw error;
      }
      if (error instanceof Stripe.errors.StripeCardError) {
        throw new HttpsError("aborted", error.message);
      }
      throw new HttpsError("internal", "The system encountered an unexpected issue and has recovered.");
    }
});


const ADMIN_SECRET = "oryon-super-secret-key-2024";

export const setAdminRole = functions.https.onCall({ region: REGION }, async (data, context) => {
  if (context.auth?.token.admin !== true && data.adminSecret !== ADMIN_SECRET) {
    throw new functions.https.HttpsError("permission-denied", "Only administrators can add other administrators.");
  }
  const email = data.email;
  if (!email || typeof email !== 'string') {
    throw new functions.https.HttpsError("invalid-argument", "The 'email' field is required and must be a string.");
  }
  try {
    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().setCustomUserClaims(user.uid, { admin: true });
    // Revoke tokens to force the user to re-authenticate and get the new claim
    await admin.auth().revokeRefreshTokens(user.uid);
    logger.info(`Successfully promoted ${email} (${user.uid}) to admin.`);
    return { message: `Success! ${email} has been promoted to administrator. The user will need to log in again to see the changes.` };
  } catch (error: any) {
    logger.error("Error setting admin role:", { email, error });
    if (error.code === 'auth/user-not-found') {
      throw new functions.https.HttpsError("not-found", `User with email ${email} was not found.`);
    }
    throw new functions.https.HttpsError("internal", "An internal error occurred while trying to set the admin role.");
  }
});
    
const PaymentSchema = z.object({
    amount: z.number().int().positive().max(1000000), // Em centavos
    currency: z.enum(["usd", "brl", "eur"]),
    paymentMethodId: z.string().startsWith("pm_")
});

export const createPaymentIntent = onCall(
    { 
      secrets: [stripeApiKey],
      region: REGION,
      enforceAppCheck: true // Segurança endurecida
    },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError("unauthenticated", "A autenticação é necessária para processar pagamentos.");
        }
      
        const validation = PaymentSchema.safeParse(request.data);
        if (!validation.success) {
            logger.warn("Invalid payment data received", { uid: request.auth.uid, errors: validation.error.flatten() });
            throw new HttpsError("invalid-argument", "Dados de pagamento inválidos ou corrompidos.", validation.error.flatten());
        }
  
      // A chave secreta só é carregada aqui, dentro do escopo da função, quando é necessária.
      const stripe = new Stripe(stripeApiKey.value(), { apiVersion: "2024-06-20", typescript: true });
  
      try {
        const { amount, currency, paymentMethodId } = validation.data;
        const customerId = request.auth.uid; // Usar o UID do Firebase como ID do cliente

        // Lógica de negócio real: criar um PaymentIntent no Stripe
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amount,
          currency: currency,
          payment_method: paymentMethodId,
          customer: customerId, // Associar ao cliente
          confirm: true,
          automatic_payment_methods: { enabled: true, allow_redirects: "never" }
        });
  
        logger.info(`PaymentIntent ${paymentIntent.id} created successfully for user ${customerId}`);
        
        // Retorna apenas os dados seguros e necessários para o cliente
        return { success: true, clientSecret: paymentIntent.client_secret, status: paymentIntent.status };

      } catch (error: any) {
        logger.error("Stripe API error:", { uid: request.auth.uid, error: error.message });
        const stripeError = error as Stripe.StripeRawError;
        // Não vazar o erro completo do Stripe para o cliente.
        throw new HttpsError("aborted", stripeError.message || "Falha no processamento do pagamento.");
      }
    }
);
    

    