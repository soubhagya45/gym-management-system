import { Injectable } from '@angular/core';
import { Observable, from, throwError } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { AppConfigService } from '../../../core/config/app-config';
import { IFileStorageRepository } from '../../../core/interfaces/file-storage-repository.interface';

@Injectable({
  providedIn: 'root'
})
export class FirebaseStorageRepository implements IFileStorageRepository {
  private storage: any;

  constructor(private configService: AppConfigService) {
    try {
      const config = this.configService.firebaseConfig;
      if (config && config.apiKey) {
        // Dynamically initialize Firebase if not already initialized
        const app = getApps().length === 0 ? initializeApp(config) : getApp();
        this.storage = getStorage(app);
      }
    } catch (e) {
      console.warn('Firebase Storage initialization failed:', e);
    }
  }

  uploadFile(file: File, folder: string, fileName?: string): Observable<string> {
    if (!this.storage) {
      return throwError(() => new Error('Firebase Storage is not configured.'));
    }
    const name = fileName || `${Date.now()}_${file.name}`;
    const storageRef = ref(this.storage, `${folder}/${name}`);
    return from(uploadBytes(storageRef, file)).pipe(
      switchMap(() => from(getDownloadURL(storageRef))),
      catchError(err => throwError(() => new Error(`Firebase upload error: ${err.message || err}`)))
    );
  }

  deleteFile(url: string): Observable<void> {
    if (!this.storage) {
      return throwError(() => new Error('Firebase Storage is not configured.'));
    }
    try {
      const storageRef = ref(this.storage, url);
      return from(deleteObject(storageRef)).pipe(
        catchError(err => throwError(() => new Error(`Firebase delete error: ${err.message || err}`)))
      );
    } catch (err: any) {
      return throwError(() => new Error(`Invalid URL or deletion failed: ${err.message || err}`));
    }
  }
}
