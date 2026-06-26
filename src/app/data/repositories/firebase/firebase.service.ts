import { Injectable } from '@angular/core';
import { initializeApp, getApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import { AppConfigService } from '../../../core/config/app-config';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {
  private app!: FirebaseApp;
  private auth!: Auth;
  private db!: Firestore;
  private storage!: FirebaseStorage;
  private initialized = false;

  constructor(private configService: AppConfigService) {
    this.init();
  }

  private init() {
    try {
      const config = this.configService.firebaseConfig;
      if (config && config.apiKey) {
        this.app = getApps().length === 0 ? initializeApp(config) : getApp();

        // Configure App Check using ReCaptcha V3
        const siteKey = config.appCheckSiteKey || '6Ld_aKcqAAAAAONWwIpl3Wz_dD6JpP4qY51Fj89-';
        
        // Use a fixed debug token in local development environment to avoid blocking local queries
        if (!environment.production) {
          (window as any).FIREBASE_APPCHECK_DEBUG_TOKEN = '88023436-5deb-41f4-98ca-1f36dabfffe7';
        }

        try {
          initializeAppCheck(this.app, {
            provider: new ReCaptchaV3Provider(siteKey),
            isTokenAutoRefreshEnabled: true
          });
          console.log('[FirebaseService] Firebase App Check initialized successfully.');
        } catch (appCheckErr) {
          console.error('[FirebaseService] App Check initialization failed:', appCheckErr);
        }

        this.auth = getAuth(this.app);
        this.db = getFirestore(this.app);
        this.storage = getStorage(this.app);
        this.initialized = true;
      }
    } catch (e) {
      console.error('Firebase Service initialization failed:', e);
    }
  }

  getAuth(): Auth {
    if (!this.initialized) this.init();
    return this.auth;
  }

  getDb(): Firestore {
    if (!this.initialized) this.init();
    return this.db;
  }

  getStorage(): FirebaseStorage {
    if (!this.initialized) this.init();
    return this.storage;
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}
