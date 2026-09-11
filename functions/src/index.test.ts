import { HttpsError } from 'firebase-functions/v2/https';
import { OrderService } from './index';
import Stripe from 'stripe';

const mockPaymentIntentCreate = jest.fn();
const mockTransactionSet = jest.fn().mockResolvedValue(undefined);
const mockDoc = jest.fn(() => ({
  set: mockTransactionSet,
  get: jest.fn().mockResolvedValue({ exists: false, data: () => undefined }),
}));
const mockCollection = jest.fn(() => ({ doc: mockDoc }));
const mockFirestore = jest.fn(() => ({ collection: mockCollection }));
Object.assign(mockFirestore, {
  FieldValue: { serverTimestamp: jest.fn(() => 'server-timestamp') },
});

jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(),
  firestore: mockFirestore,
  auth: jest.fn(() => ({
    getUser: jest.fn(),
    setCustomUserClaims: jest.fn(),
    revokeRefreshTokens: jest.fn(),
  })),
}));

jest.mock('stripe', () => jest.fn().mockImplementation(() => ({
  paymentIntents: { create: mockPaymentIntentCreate },
})));

describe('OrderService', () => {
  let orderService: OrderService;

  beforeAll(() => {
    orderService = OrderService.getInstance('test-stripe-key');
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockPaymentIntentCreate.mockReset();
    mockTransactionSet.mockReset();
    mockTransactionSet.mockResolvedValue(undefined);
  });

  test('processes an order when stock is available and payment succeeds', async () => {
    mockPaymentIntentCreate.mockResolvedValue({
      id: 'pi_123',
      client_secret: 'pi_secret_123',
      status: 'succeeded',
    });

    const result = await orderService.processNewOrder({
      itemId: 'prod_abc',
      quantity: 1,
      amount: 10000,
      currency: 'usd',
      paymentMethodId: 'pm_123',
      customerId: 'firebase-user-123',
      companyId: 'txuna-bet',
    });

    expect(mockPaymentIntentCreate).toHaveBeenCalledWith({
      amount: 11700,
      currency: 'usd',
      payment_method: 'pm_123',
      confirm: true,
      automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
      metadata: {
        firebaseUid: 'firebase-user-123',
        companyId: 'txuna-bet',
        itemId: 'prod_abc',
        quantity: '1',
        tax_amount: '1700',
      },
    });
    expect(mockTransactionSet).toHaveBeenCalled();
    expect(result).toEqual({
      clientSecret: 'pi_secret_123',
      status: 'succeeded',
      totalAmount: 11700,
    });
  });

  test('rejects an order when stock is unavailable', async () => {
    await expect(orderService.processNewOrder({
      itemId: 'prod_xyz',
      quantity: 5,
      amount: 5000,
      currency: 'eur',
      paymentMethodId: 'pm_456',
      customerId: 'firebase-user-456',
      companyId: 'txuna-bet',
    })).rejects.toThrow(new HttpsError('failed-precondition', 'Item prod_xyz is out of stock.'));

    expect(mockPaymentIntentCreate).not.toHaveBeenCalled();
  });

  test('propagates a Stripe payment error from the service layer', async () => {
    const stripeError = new Stripe.errors.StripeCardError({
      code: 'card_declined',
      message: 'Your card was declined.',
    } as never);
    mockPaymentIntentCreate.mockRejectedValue(stripeError);

    await expect(orderService.processNewOrder({
      itemId: 'prod_abc',
      quantity: 1,
      amount: 10000,
      currency: 'usd',
      paymentMethodId: 'pm_card_error',
      customerId: 'firebase-user-789',
      companyId: 'txuna-bet',
    })).rejects.toThrow(stripeError);
  });
});