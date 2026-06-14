import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { AppConfigService } from '../../../core/config/app-config';
import { IFileStorageRepository } from '../../../core/interfaces/file-storage-repository.interface';

@Injectable({
  providedIn: 'root'
})
export class ApiFileStorageRepository implements IFileStorageRepository {
  constructor(
    private http: HttpClient,
    private configService: AppConfigService
  ) {}

  uploadFile(file: File, folder: string, fileName?: string): Observable<string> {
    const apiUrl = this.configService.apiUrl;
    if (!apiUrl) {
      return throwError(() => new Error('API URL is not configured.'));
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);
    if (fileName) {
      formData.append('fileName', fileName);
    }

    return this.http.post<{ url: string }>(`${apiUrl}/storage/upload`, formData).pipe(
      map(res => res.url),
      catchError(err => throwError(() => new Error(`API upload error: ${err.message || err}`)))
    );
  }

  deleteFile(url: string): Observable<void> {
    const apiUrl = this.configService.apiUrl;
    if (!apiUrl) {
      return throwError(() => new Error('API URL is not configured.'));
    }

    return this.http.delete<void>(`${apiUrl}/storage/delete`, { body: { url } }).pipe(
      catchError(err => throwError(() => new Error(`API delete error: ${err.message || err}`)))
    );
  }
}
