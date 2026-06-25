import { Injectable } from '@angular/core';
import { Observable, from, throwError } from 'rxjs';
import { switchMap, catchError, map } from 'rxjs/operators';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { FirebaseService } from './firebase.service';
import { IFileStorageRepository } from '../../../core/interfaces/file-storage-repository.interface';

/**
 * Allowlist of valid top-level storage folder segments.
 * The actual path should follow the pattern: gyms/{gymId}/{segment}/...
 */
const ALLOWED_FOLDER_SEGMENTS = new Set([
  'members', 'employees', 'trainers', 'logos', 'progress',
  'invoices', 'products', 'imports', 'snapshots', 'attachments', 'documents'
]);

/**
 * Sanitizes a storage folder path to prevent path traversal attacks.
 * - Strips leading/trailing slashes
 * - Rejects paths containing '..' or null bytes
 * - Validates top-level segments against the allowlist for non-gyms-prefixed paths
 * - Logs a warning if path is not tenant-scoped (gyms/{gymId}/...)
 */
function sanitizeFolderPath(folder: string): string {
  if (!folder || typeof folder !== 'string') {
    throw new Error('[FirebaseStorage] Invalid folder path: empty or non-string.');
  }
  // Reject path traversal attempts
  if (folder.includes('..') || folder.includes('\0') || folder.includes('//')) {
    throw new Error(`[FirebaseStorage] Rejected potentially unsafe folder path: "${folder}"`);
  }
  // Normalize: remove leading/trailing slashes
  const normalized = folder.replace(/^\/+|\/+$/g, '');
  // Enforce tenant-scoped paths — warn but allow through for backward compatibility
  if (!normalized.startsWith('gyms/')) {
    console.warn(
      `[FirebaseStorage] SECURITY: Upload folder "${normalized}" is not tenant-scoped. ` +
      `Update call site to use "gyms/{gymId}/..." for full tenant isolation.`
    );
  }
  // Validate the top-level segment against the allowlist for non-gyms paths
  const segments = normalized.split('/');
  const rootSegment = segments[0];
  if (rootSegment !== 'gyms' && !ALLOWED_FOLDER_SEGMENTS.has(rootSegment)) {
    throw new Error(
      `[FirebaseStorage] Rejected unknown storage folder segment: "${rootSegment}". ` +
      `Allowed: ${[...ALLOWED_FOLDER_SEGMENTS].join(', ')}.`
    );
  }
  return normalized;
}

@Injectable({
  providedIn: 'root'
})
export class FirebaseStorageRepository implements IFileStorageRepository {

  constructor(private firebaseService: FirebaseService) {}

  private get storage() {
    return this.firebaseService.getStorage();
  }

  uploadFile(file: File, folder: string, fileName?: string): Observable<string> {
    let sanitizedFolder: string;
    try {
      sanitizedFolder = sanitizeFolderPath(folder);
    } catch (e: any) {
      return throwError(() => new Error(e.message));
    }
    // Sanitize filename: replace any character that is not alphanumeric, dot, underscore, or hyphen
    const safeName = fileName
      ? fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
      : `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const storageRef = ref(this.storage, `${sanitizedFolder}/${safeName}`);
    return from(uploadBytes(storageRef, file)).pipe(
      switchMap(() => from(getDownloadURL(storageRef))),
      catchError(err => throwError(() => new Error(`Firebase upload error: ${err.message || err}`)))
    );
  }

  deleteFile(url: string): Observable<void> {
    try {
      const storageRef = ref(this.storage, url);
      return from(deleteObject(storageRef)).pipe(
        catchError(err => throwError(() => new Error(`Firebase delete error: ${err.message || err}`)))
      );
    } catch (err: any) {
      return throwError(() => new Error(`Invalid URL or deletion failed: ${err.message || err}`));
    }
  }

  downloadFile(path: string): Observable<Blob> {
    return this.getFileUrl(path).pipe(
      switchMap(url => from(fetch(url).then(res => res.blob()))),
      catchError(err => throwError(() => new Error(`Firebase download error: ${err.message || err}`)))
    );
  }

  getFileUrl(path: string): Observable<string> {
    try {
      const storageRef = ref(this.storage, path);
      return from(getDownloadURL(storageRef)).pipe(
        catchError(err => throwError(() => new Error(`Firebase get URL error: ${err.message || err}`)))
      );
    } catch (err: any) {
      return throwError(() => new Error(`Invalid path: ${err.message || err}`));
    }
  }

  moveFile(oldPath: string, newPath: string): Observable<void> {
    return this.downloadFile(oldPath).pipe(
      switchMap(blob => {
        const file = new File([blob], newPath.split('/').pop() || 'file');
        const folder = newPath.substring(0, newPath.lastIndexOf('/'));
        const name = newPath.substring(newPath.lastIndexOf('/') + 1);
        return this.uploadFile(file, folder, name);
      }),
      switchMap(() => this.deleteFile(oldPath)),
      map(() => undefined),
      catchError(err => throwError(() => new Error(`Firebase move file error: ${err.message || err}`)))
    );
  }
}
