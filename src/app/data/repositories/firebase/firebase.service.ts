import { Injectable } from '@angular/core';
import { initializeApp, getApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { AppConfigService } from '../../../core/config/app-config';

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
