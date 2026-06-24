import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

export interface IStorageProvider {
  upload(file: File, path: string): Observable<string>;
  delete(path: string): Observable<void>;
}

export const STORAGE_PROVIDER_TOKEN = new InjectionToken<IStorageProvider>('STORAGE_PROVIDER_TOKEN');
