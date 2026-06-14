import { Injectable, InjectionToken } from '@angular/core';

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
    // provider: ProviderType.Mock 
    // Default to mock database for local demo

    provider: ProviderType.Mock, // Default to mock database for local demo
    firebaseConfig: {
      apiKey: "AIzaSyAgOsXMU4Mpy7AmBZXa11-GFDJWCYoyc90",
      authDomain: "apexfit-saas-dev.firebaseapp.com",
      projectId: "apexfit-saas-dev",
      storageBucket: "apexfit-saas-dev.firebasestorage.app",
      messagingSenderId: "463009229431",
      appId: "1:463009229431:web:c5e0282bf11a0c701f7472",
      measurementId: "G-W1WL8C1HB3"
    }
  };

  constructor() {
    // Try to load from localStorage or environment in a real app
    const savedProvider = localStorage.getItem('apexfit_provider');
    if (savedProvider && Object.values(ProviderType).includes(savedProvider as ProviderType)) {
      this.config.provider = savedProvider as ProviderType;
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
    this.config.provider = provider;
    localStorage.setItem('apexfit_provider', provider);
    // Reload page to re-initialize Dependency Injection tree
    window.location.reload();
  }
}
