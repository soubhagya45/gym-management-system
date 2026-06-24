import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AppConfigService } from '../../../core/config/app-config';
import { BaseApiRepository } from '../../../core/repositories/base-api.repository';
import { IFileStorageRepository } from '../../../core/interfaces/file-storage-repository.interface';

@Injectable({
  providedIn: 'root'
})
export class ApiFileStorageRepository extends BaseApiRepository implements IFileStorageRepository {
  protected get endpoint(): string {
    return '/storage';
  }

  constructor(
    http: HttpClient,
    configService: AppConfigService
  ) {
    super(http, configService);
  }

  uploadFile(file: File, folder: string, fileName?: string): Observable<string> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);
    if (fileName) {
      formData.append('fileName', fileName);
    }

    return this.post<{ url: string }>('/upload', formData).pipe(
      map(res => res.url)
    );
  }

  deleteFile(url: string): Observable<void> {
    return this.delete<void>('/delete', { body: { url } } as any);
  }

  downloadFile(path: string): Observable<Blob> {
    const params = new HttpParams().set('path', path);
    return this.http.get(this.getFullUrl('/download'), {
      params,
      responseType: 'blob'
    });
  }

  getFileUrl(path: string): Observable<string> {
    const params = new HttpParams().set('path', path);
    return this.get<{ url: string }>('/url', { params }).pipe(
      map(res => res.url)
    );
  }

  moveFile(oldPath: string, newPath: string): Observable<void> {
    return this.post<void>('/move', { oldPath, newPath });
  }
}
