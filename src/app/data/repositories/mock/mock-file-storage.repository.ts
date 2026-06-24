import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { IFileStorageRepository } from '../../../core/interfaces/file-storage-repository.interface';

@Injectable({
  providedIn: 'root'
})
export class MockFileStorageRepository implements IFileStorageRepository {
  uploadFile(file: File, folder: string, fileName?: string): Observable<string> {
    // Generate a temporary browser object URL to allow instant previews of local uploaded files
    const objectUrl = URL.createObjectURL(file);
    return of(objectUrl).pipe(delay(500));
  }

  deleteFile(url: string): Observable<void> {
    try {
      URL.revokeObjectURL(url);
    } catch (e) {
      console.warn('Revoking object URL failed:', e);
    }
    return of(undefined).pipe(delay(200));
  }

  downloadFile(path: string): Observable<Blob> {
    const dummyBlob = new Blob(['Mock file content for ' + path], { type: 'text/plain' });
    return of(dummyBlob).pipe(delay(200));
  }

  getFileUrl(path: string): Observable<string> {
    return of(path).pipe(delay(100));
  }

  moveFile(oldPath: string, newPath: string): Observable<void> {
    console.log(`Mock storage: moved file from ${oldPath} to ${newPath}`);
    return of(undefined).pipe(delay(150));
  }
}
