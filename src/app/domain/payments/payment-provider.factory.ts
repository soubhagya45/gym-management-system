import { Injectable, Injector } from '@angular/core';
import { PaymentProvider } from '../../core/interfaces/payment-provider.interface';
import { ManualUPIProvider } from './providers/manual-upi.provider';
import { RazorpayProvider } from './providers/razorpay.provider';
import { CashfreeProvider } from './providers/cashfree.provider';
import { StripeProvider } from './providers/stripe.provider';
import { PaytmProvider } from './providers/paytm.provider';

@Injectable({ providedIn: 'root' })
export class PaymentProviderFactory {
  constructor(private injector: Injector) {}

  getProvider(providerName: string): PaymentProvider {
    switch (providerName) {
      case 'Manual UPI':
      case 'ManualUPI':
        return this.injector.get(ManualUPIProvider);
      case 'Razorpay':
        return this.injector.get(RazorpayProvider);
      case 'Cashfree':
        return this.injector.get(CashfreeProvider);
      case 'Stripe':
        return this.injector.get(StripeProvider);
      case 'Paytm':
        return this.injector.get(PaytmProvider);
      default:
        // Default fallback is Manual UPI
        return this.injector.get(ManualUPIProvider);
    }
  }
}
