import { HttpsError } from 'firebase-functions/v2/https';
import { OrderService } from './index';
import Stripe from 'stripe';

jest.mock('firebase-admin', () => {
  const transactionSet = jest.fn().mockResolvedValue(undefined);
  const doc = jest.fn(() => ({
    set: transactionSet,
    get: jest.fn().mockResolvedValue({ exists: false, data: () => undefined }),
  }));
  const collection = jest.fn(() => ({ doc }));
  const firestore = Object.assign(jest.fn(() => ({ collection })), {
    FieldValue: { serverTimestamp: jest.fn(() => 'server-timestamp') },
  });
  const auth = jest.fn(() => ({ getUser: jest.fn(), setCustomUserClaims: jest.fn(), revokeRefreshTokens: jest.fn() }));
  return { initializeApp: jest.fn(), firestore, auth };
});

jest.mock('stripe', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const firebaseAdminMock = jest.requireMock('firebase-admin') as {
  firestore: jest.Mock & { FieldValue: { serverTimestamp: jest.Mock } };
};
const stripeConstructor = Stripe as unknown as jest.Mock;
const mockFirestore = firebaseAdminMock.firestore;
const mockCollection = mockFirestore().collection;
const mockDoc = mockCollection().doc;
const mockTransactionSet = mockDoc().set;
const mockPaymentIntentCreate = jest.fn();
const mockStripeInstance = { paymentIntents: { create: mockPaymentIntentCreate } };

beforeAll(() => {
  stripeConstructor.mockImplementation(() => mockStripeInstance);
});

describe('OrderService', () => {
  let orderService: OrderService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPaymentIntentCreate.mockReset();
    mockTransactionSet.mockReset();
    mockTransactionSet.mockResolvedValue(undefined);
    orderService = OrderService.getInstance('test-stripe-key');
    mockPaymentIntentCreate.mockReset();
  });

  test('processes an order when stock is available and payment succeeds', async () => {
    mockPaymentIntentCreate.mockResolvedValue({ id: 'pi_123', client_secret: 'pi_secret_123', status: 'succeeded' });

    const result = await orderService.processNewOrder({
      itemId: 'prod_abc', quantity: 1, amount: 10000, currency: 'usd', paymentMethodId: 'pm_123', customerId: 'firebase-user-123', companyId: 'txuna-bet',
    });

    expect(mockPaymentIntentCreate).toHaveBeenCalledWith({
      amount: 11700,
      currency: 'usd',
      payment_method: 'pm_123',
      confirm: true,
      automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
      metadata: { firebaseUid: 'firebase-user-123', companyId: 'txuna-bet', itemId: 'prod_abc', quantity: '1', tax_amount: '1700' },
    });
    expect(mockTransactionSet).toHaveBeenCalled();
    expect(result).toEqual({ clientSecret: 'pi_secret_123', status: 'succeeded', totalAmount: 11700 });
  });

  test('rejects an order when stock is unavailable', async () => {
    await expect(orderService.processNewOrder({
      itemId: 'prod_xyz', quantity: 5, amount: 5000, currency: 'eur', paymentMethodId: 'pm_456', customerId: 'firebase-user-456', companyId: 'txuna-bet',
    })).rejects.toThrow(new HttpsError('failed-precondition', 'Item prod_xyz is out of stock.'));
    expect(mockPaymentIntentCreate).not.toHaveBeenCalled();
  });

  test('propagates a Stripe payment error from the service layer', async () => {
    const stripeError = new Error('Your card was declined.');
    mockPaymentIntentCreate.mockRejectedValue(stripeError);

    await expect(orderService.processNewOrder({
      itemId: 'prod_abc', quantity: 1, amount: 10000, currency: 'usd', paymentMethodId: 'pm_card_error', customerId: 'firebase-user-789', companyId: 'txuna-bet',
    })).rejects.toThrow(stripeError);
  });
});
