import { HttpsError } from 'firebase-functions/v2/https';
import { OrderService, StockService, TaxService } from './index';
import Stripe from 'stripe';

const mockSet = jest.fn().mockResolvedValue(undefined);
const mockDoc = jest.fn(() => ({ set: mockSet, get: jest.fn().mockResolvedValue({ exists: false, data: () => undefined }) }));
const mockCollection = jest.fn(() => ({ doc: mockDoc }));
const mockFirestore = Object.assign(jest.fn(() => ({ collection: mockCollection })), {
  FieldValue: { serverTimestamp: jest.fn(() => 'server-timestamp') },
});

jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(),
  firestore: mockFirestore,
  auth: jest.fn(() => ({ getUser: jest.fn(), setCustomUserClaims: jest.fn(), revokeRefreshTokens: jest.fn() })),
}));

jest.mock('stripe', () => jest.fn().mockImplementation(() => ({
  paymentIntents: { create: jest.fn() },
})));

jest.mock('./index', () => {
  const originalModule = jest.requireActual('./index');
  return {
    ...originalModule,
    StockService: { getInstance: jest.fn().mockReturnValue({ verifyStock: jest.fn() }) },
    TaxService: { getInstance: jest.fn().mockReturnValue({ calculateTax: jest.fn() }) },
  };
});

const MockedStripe = Stripe as unknown as jest.MockedClass<typeof Stripe>;
const mockStockService = StockService.getInstance() as jest.Mocked<StockService>;
const mockTaxService = TaxService.getInstance() as jest.Mocked<TaxService>;
const mockStripeInstance = new MockedStripe('test-key') as jest.Mocked<Stripe>;

describe('OrderService', () => {
  let orderService: OrderService;

  beforeEach(() => {
    jest.clearAllMocks();
    (Stripe as unknown as jest.Mock).mockReturnValue(mockStripeInstance);
    orderService = OrderService.getInstance('test-stripe-key');
  });

  test('processes an order when stock is available and payment succeeds', async () => {
    const orderData = {
      itemId: 'prod_abc', quantity: 1, amount: 10000, currency: 'usd' as const,
      paymentMethodId: 'pm_123', customerId: 'firebase-user-123', companyId: 'txuna-bet',
    };
    mockStockService.verifyStock.mockResolvedValue(true);
    mockTaxService.calculateTax.mockResolvedValue(1700);
    (mockStripeInstance.paymentIntents.create as jest.Mock).mockResolvedValue({ id: 'pi_123', client_secret: 'pi_secret_123', status: 'succeeded' });

    const result = await orderService.processNewOrder(orderData);

    expect(mockStockService.verifyStock).toHaveBeenCalledWith(orderData.itemId, orderData.quantity);
    expect(mockTaxService.calculateTax).toHaveBeenCalledWith(orderData.amount);
    expect(mockStripeInstance.paymentIntents.create).toHaveBeenCalledWith({
      amount: 11700,
      currency: 'usd',
      payment_method: orderData.paymentMethodId,
      confirm: true,
      automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
      metadata: { firebaseUid: orderData.customerId, companyId: orderData.companyId, itemId: orderData.itemId, quantity: '1', tax_amount: '1700' },
    });
    expect(mockSet).toHaveBeenCalled();
    expect(result).toEqual({ clientSecret: 'pi_secret_123', status: 'succeeded', totalAmount: 11700 });
  });

  test('rejects an order when stock is unavailable', async () => {
    const orderData = {
      itemId: 'prod_xyz', quantity: 5, amount: 5000, currency: 'eur' as const,
      paymentMethodId: 'pm_456', customerId: 'firebase-user-456', companyId: 'txuna-bet',
    };
    mockStockService.verifyStock.mockResolvedValue(false);
    mockTaxService.calculateTax.mockResolvedValue(850);

    await expect(orderService.processNewOrder(orderData)).rejects.toThrow(new HttpsError('failed-precondition', `Item ${orderData.itemId} is out of stock.`));
    expect(mockStripeInstance.paymentIntents.create).not.toHaveBeenCalled();
  });

  test('propagates a Stripe payment error from the service layer', async () => {
    const orderData = {
      itemId: 'prod_abc', quantity: 1, amount: 10000, currency: 'usd' as const,
      paymentMethodId: 'pm_card_error', customerId: 'firebase-user-789', companyId: 'txuna-bet',
    };
    mockStockService.verifyStock.mockResolvedValue(true);
    mockTaxService.calculateTax.mockResolvedValue(1700);
    const stripeError = new Stripe.errors.StripeCardError({ code: 'card_declined', message: 'Your card was declined.' } as never);
    (mockStripeInstance.paymentIntents.create as jest.Mock).mockRejectedValue(stripeError);

    await expect(orderService.processNewOrder(orderData)).rejects.toThrow(stripeError);
  });
});
