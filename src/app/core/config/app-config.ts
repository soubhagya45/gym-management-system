import { Injectable, InjectionToken } from '@angular/core';
import { environment } from '../../../environments/environment';

export enum ProviderType {
  Mock = 'MOCK',
  Firebase = 'FIREBASE',
  Supabase = 'SUPABASE',
  REST = 'REST'
}

export interface AppConfig {
  provider: ProviderType;
  firebaseConfig?: any;
  supabaseConfig?: any;
  apiUrl?: string;
}

export const APP_CONFIG = new InjectionToken<AppConfig>('app.config');

@Injectable({
  providedIn: 'root'
})
export class AppConfigService {
  private config: AppConfig = {
    // Default to Firebase as active provider, configuration loaded from environment
    provider: ProviderType.Firebase,
    firebaseConfig: environment.firebase
  };

  constructor() {
    // Only allow local provider override in development mode
    if (!environment.production) {
      const savedProvider = localStorage.getItem('apexfit_provider');
      if (savedProvider && Object.values(ProviderType).includes(savedProvider as ProviderType)) {
        this.config.provider = savedProvider as ProviderType;
      }
    }
  }

  get provider(): ProviderType {
    return this.config.provider;
  }

  get firebaseConfig(): any {
    return this.config.firebaseConfig;
  }

  get apiUrl(): string | undefined {
    return this.config.apiUrl;
  }

  setProvider(provider: ProviderType): void {
    if (environment.production) {
      console.warn('Cannot switch provider in production mode.');
      return;
    }
    this.config.provider = provider;
    localStorage.setItem('apexfit_provider', provider);
    // Reload page to re-initialize Dependency Injection tree
    window.location.reload();
  }
}

