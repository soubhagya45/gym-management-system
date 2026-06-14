import { Injectable } from '@angular/core';
import { Observable, from, throwError } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
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
}
