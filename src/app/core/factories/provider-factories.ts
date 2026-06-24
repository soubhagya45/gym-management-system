import { InjectionToken } from '@angular/core';

export interface IPaymentProvider {
  processPayment(amount: number, details: any): any;
  processRefund(invoiceId: string, amount: number): any;
}

export interface INotificationProvider {
  sendSMS(to: string, message: string): any;
  sendWhatsApp(to: string, message: string): any;
  sendEmail(to: string, subject: string, body: string): any;
}

export type PaymentProviderFactory = (providerName: string) => IPaymentProvider;
export type NotificationProviderFactory = (providerName: string) => INotificationProvider;
export type StorageProviderFactory = (providerName: string) => any;
export type BackgroundJobProviderFactory = (providerName: string) => any;
export type AuthenticationProviderFactory = (providerName: string) => any;

export const PAYMENT_PROVIDER_FACTORY_TOKEN = new InjectionToken<PaymentProviderFactory>('PAYMENT_PROVIDER_FACTORY_TOKEN');
export const NOTIFICATION_PROVIDER_FACTORY_TOKEN = new InjectionToken<NotificationProviderFactory>('NOTIFICATION_PROVIDER_FACTORY_TOKEN');
export const STORAGE_PROVIDER_FACTORY_TOKEN = new InjectionToken<StorageProviderFactory>('STORAGE_PROVIDER_FACTORY_TOKEN');
export const BACKGROUND_JOB_PROVIDER_FACTORY_TOKEN = new InjectionToken<BackgroundJobProviderFactory>('BACKGROUND_JOB_PROVIDER_FACTORY_TOKEN');
export const AUTHENTICATION_PROVIDER_FACTORY_TOKEN = new InjectionToken<AuthenticationProviderFactory>('AUTHENTICATION_PROVIDER_FACTORY_TOKEN');
