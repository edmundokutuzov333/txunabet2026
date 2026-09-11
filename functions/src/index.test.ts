
import { HttpsError } from "firebase-functions/v2/https";
import { OrderService, StockService, TaxService } from "./index";
import Stripe from "stripe";

// ============================================================================
// MOCKING: Isolate our services from external dependencies.
// ============================================================================

// Mocking the Stripe class and its methods
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    paymentIntents: {
      create: jest.fn(),
    },
  }));
});

// Mock the individual singleton services
jest.mock('./index', () => {
    const originalModule = jest.requireActual('./index');
    return {
        ...originalModule,
        StockService: {
            getInstance: jest.fn().mockReturnValue({
                verifyStock: jest.fn(),
            }),
        },
        TaxService: {
            getInstance: jest.fn().mockReturnValue({
                calculateTax: jest.fn(),
            }),
        },
    };
});


// Type-safe mock instances
const MockedStripe = Stripe as jest.MockedClass<typeof Stripe>;
const mockStockService = StockService.getInstance() as jest.Mocked<StockService>;
const mockTaxService = TaxService.getInstance() as jest.Mocked<TaxService>;
const mockStripeInstance = new MockedStripe('test-key') as jest.Mocked<Stripe>;


// ============================================================================
// TEST SUITE: OrderService
// ============================================================================

describe('OrderService', () => {
  let orderService: OrderService;

  // Before each test, reset mocks to ensure test isolation
  beforeEach(() => {
    jest.clearAllMocks();
    
    // We get a new instance of the OrderService, which internally
    // gets the mocked singletons for StockService and TaxService.
    orderService = OrderService.getInstance('test-stripe-key');
    
    // We also need to mock the Stripe instance that OrderService creates internally.
    (Stripe as jest.Mock).mockReturnValue(mockStripeInstance);
  });

  // --- Test Case 1: The "Happy Path" ---
  test('should successfully process an order when stock is available and payment succeeds', async () => {
    // Arrange: Setup the mocks to simulate a successful scenario
    const orderData = {
      itemId: 'prod_abc',
      quantity: 1,
      amount: 10000, // 100.00 USD
      currency: 'usd' as const,
      paymentMethodId: 'pm_123',
      customerId: 'cust_123',
    };

    mockStockService.verifyStock.mockResolvedValue(true);
    mockTaxService.calculateTax.mockResolvedValue(1700); // 17.00 USD tax
    (mockStripeInstance.paymentIntents.create as jest.Mock).mockResolvedValue({
      client_secret: 'pi_secret_123',
      status: 'succeeded',
    });

    // Act: Execute the method under test
    const result = await orderService.processNewOrder(orderData);

    // Assert: Verify the outcomes
    expect(mockStockService.verifyStock).toHaveBeenCalledWith(orderData.itemId, orderData.quantity);
    expect(mockTaxService.calculateTax).toHaveBeenCalledWith(orderData.amount);
    expect(mockStripeInstance.paymentIntents.create).toHaveBeenCalledWith({
      amount: 11700, // 10000 (base) + 1700 (tax)
      currency: 'usd',
      payment_method: orderData.paymentMethodId,
      customer: orderData.customerId,
      confirm: true,
      automatic_payment_methods: { enabled: true, allow_redirects: "never" },
      metadata: {
        itemId: orderData.itemId,
        quantity: orderData.quantity,
        tax_amount: 1700,
      },
    });
    expect(result).toEqual({
      clientSecret: 'pi_secret_123',
      status: 'succeeded',
      totalAmount: 11700,
    });
  });

  // --- Test Case 2: The "Out of Stock" Path ---
  test('should throw HttpsError when item is out of stock', async () => {
    // Arrange: Setup the mocks for an out-of-stock scenario
    const orderData = {
      itemId: 'prod_xyz',
      quantity: 5,
      amount: 5000,
      currency: 'eur' as const,
      paymentMethodId: 'pm_456',
      customerId: 'cust_456',
    };

    mockStockService.verifyStock.mockResolvedValue(false); // Item is out of stock
    mockTaxService.calculateTax.mockResolvedValue(850); // Tax is still calculated in parallel

    // Act & Assert: Expect the function to reject with a specific error
    await expect(orderService.processNewOrder(orderData)).rejects.toThrow(
      new HttpsError("failed-precondition", `Item ${orderData.itemId} is out of stock.`)
    );

    // Verify that payment was NOT attempted
    expect(mockStripeInstance.paymentIntents.create).not.toHaveBeenCalled();
  });
  
  // --- Test Case 3: The "Payment Failure" Path ---
  test('should re-throw Stripe error if payment intent creation fails', async () => {
    // Arrange: Setup mocks for a payment failure scenario
     const orderData = {
      itemId: 'prod_abc',
      quantity: 1,
      amount: 10000,
      currency: 'usd' as const,
      paymentMethodId: 'pm_card_error',
      customerId: 'cust_789',
    };

    mockStockService.verifyStock.mockResolvedValue(true); // Stock is available
    mockTaxService.calculateTax.mockResolvedValue(1700);
    
    // Simulate a Stripe card error
    const stripeError = new Stripe.errors.StripeCardError({
        code: 'card_declined',
        message: 'Your card was declined.',
        decline_code: 'generic_decline',
        charge: 'ch_123',
    } as any);
    (mockStripeInstance.paymentIntents.create as jest.Mock).mockRejectedValue(stripeError);

    // Act & Assert: Expect the specific Stripe error to be thrown
    await expect(orderService.processNewOrder(orderData)).rejects.toThrow(stripeError);
    
     // Verify that stock and tax were checked before the payment attempt
    expect(mockStockService.verifyStock).toHaveBeenCalled();
    expect(mockTaxService.calculateTax).toHaveBeenCalled();
  });

});
