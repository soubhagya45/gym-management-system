import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { IFileStorageRepository } from '../../../core/interfaces/file-storage-repository.interface';

/**
 * SupabaseFileStorageRepository
 *
 * STUB IMPLEMENTATION — Supabase Storage SDK not yet integrated.
 * All methods throw an explicit error to prevent silent mock fallback.
 *
 * To implement: install `@supabase/supabase-js` and replace each method
 * with the appropriate Supabase Storage bucket call.
 */
@Injectable({ providedIn: 'root' })
export class SupabaseFileStorageRepository implements IFileStorageRepository {

  private notEnabled(): Observable<any> {
    return throwError(() => new Error(
      'Supabase File Storage integration is not enabled. ' +
      'Install @supabase/supabase-js and implement SupabaseFileStorageRepository.'
    ));
  }

  uploadFile(file: File, folder: string, fileName?: string): Observable<string> {
    return this.notEnabled();
  }

  downloadFile(path: string): Observable<Blob> {
    return this.notEnabled();
  }

  deleteFile(url: string): Observable<void> {
    return this.notEnabled();
  }

  getFileUrl(path: string): Observable<string> {
    return this.notEnabled();
  }

  moveFile(oldPath: string, newPath: string): Observable<void> {
    return this.notEnabled();
  }
}
