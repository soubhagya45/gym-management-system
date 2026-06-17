import { Injectable } from '@angular/core';
import { Observable, from, throwError, Observer } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

declare var Razorpay: any;

@Injectable({
  providedIn: 'root'
})
export class RazorpayService {
  private scriptUrl = 'https://checkout.razorpay.com/v1/checkout.js';
  private isScriptLoaded = false;

  private loadScript(): Observable<boolean> {
    if (this.isScriptLoaded) {
      return from([true]);
    }

    return new Observable<boolean>(observer => {
      const script = document.createElement('script');
      script.src = this.scriptUrl;
      script.onload = () => {
        this.isScriptLoaded = true;
        observer.next(true);
        observer.complete();
      };
      script.onerror = () => {
        observer.error(new Error('Failed to load Razorpay SDK. Check your internet connection.'));
      };
      document.body.appendChild(script);
    });
  }

  pay(options: {
    key: string;
    amount: number; // in paise
    currency: string;
    name: string;
    description: string;
    prefill: {
      name: string;
      email: string;
      contact: string;
    };
    notes?: any;
    theme?: {
      color: string;
    };
  }): Observable<{
    razorpay_payment_id: string;
    razorpay_order_id?: string;
    razorpay_signature?: string;
  }> {
    return this.loadScript().pipe(
      switchMap(() => {
        return new Observable<any>((observer: Observer<any>) => {
          const rzpOptions = {
            ...options,
            handler: (response: any) => {
              observer.next(response);
              observer.complete();
            },
            modal: {
              ondismiss: () => {
                observer.error(new Error('Payment cancelled by user.'));
              }
            }
          };

          try {
            const rzp = new Razorpay(rzpOptions);
            rzp.open();
          } catch (e: any) {
            observer.error(new Error(e.message || 'Razorpay initiation failed.'));
          }
        });
      }),
      catchError(err => throwError(() => err))
    );
  }
}
