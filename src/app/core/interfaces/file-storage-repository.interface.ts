import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

export interface IFileStorageRepository {
  /**
   * Uploads a file to the storage provider.
   * @param file The file to upload.
   * @param folder The folder path or category where the file should be stored (e.g. 'logos', 'members', 'employees', 'progress', 'invoices').
   * @param fileName Optional custom filename.
   * @returns An Observable emitting the uploaded file's public download URL.
   */
  uploadFile(file: File, folder: string, fileName?: string): Observable<string>;

  /**
   * Deletes a file from the storage provider.
   * @param url The public download URL or path of the file to delete.
   * @returns An Observable emitting void when complete.
   */
  deleteFile(url: string): Observable<void>;
}

export const FILE_STORAGE_REPOSITORY_TOKEN = new InjectionToken<IFileStorageRepository>('FILE_STORAGE_REPOSITORY_TOKEN');
