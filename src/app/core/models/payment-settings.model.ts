export interface PaymentSettings {
  id?: string;
  gymId: string;
  branchId?: string;
  provider: 'Manual UPI' | 'Razorpay' | 'Cashfree' | 'Stripe' | 'Paytm';
  enabled: boolean;
  gatewayConfig: {
    upiId?: string;
    businessName?: string;
    autoGenerateQR?: boolean;
    customQRImage?: string;
    supportContact?: string;
    // Gateway configs
    keyId?: string;
    keySecret?: string;
    merchantId?: string;
    webhookSecret?: string;
    apiEndpoint?: string;
  };
  createdAt: string;
  updatedAt: string;
}
