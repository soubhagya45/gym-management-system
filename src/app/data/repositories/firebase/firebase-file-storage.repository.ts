import { Injectable } from '@angular/core';
import { Observable, from, throwError } from 'rxjs';
import { switchMap, catchError, map } from 'rxjs/operators';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { FirebaseService } from './firebase.service';
import { IFileStorageRepository } from '../../../core/interfaces/file-storage-repository.interface';

@Injectable({
  providedIn: 'root'
})
export class FirebaseStorageRepository implements IFileStorageRepository {

  constructor(private firebaseService: FirebaseService) {}

  private get storage() {
    return this.firebaseService.getStorage();
  }

  uploadFile(file: File, folder: string, fileName?: string): Observable<string> {
    const name = fileName || `${Date.now()}_${file.name}`;
    const storageRef = ref(this.storage, `${folder}/${name}`);
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
