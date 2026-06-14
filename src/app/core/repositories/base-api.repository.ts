import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { retry } from 'rxjs/operators';
import { AppConfigService } from '../config/app-config';
import { Injectable } from '@angular/core';

@Injectable()
export abstract class BaseApiRepository {
  /**
   * The base endpoint path for the repository, e.g., '/members' or '/gyms'.
   * Can be an empty string if paths are absolute/unprefixed.
   */
  protected abstract get endpoint(): string;

  constructor(
    protected http: HttpClient,
    protected configService: AppConfigService
  ) {}

  /**
   * Constructs the full API URL for a given subpath.
   * Resolves relative paths by prepending the centralized `apiUrl` and the repository's `endpoint`.
   */
  protected getFullUrl(path: string): string {
    const apiBase = this.configService.apiUrl || '';
    const base = apiBase.endsWith('/') ? apiBase.slice(0, -1) : apiBase;
    const endpointPart = this.endpoint.startsWith('/') ? this.endpoint : `/${this.endpoint}`;
    const normalizedEndpoint = endpointPart === '/' ? '' : endpointPart;
    const subPath = path.startsWith('/') ? path : `/${path}`;
    const normalizedSubpath = subPath === '/' ? '' : subPath;

    return `${base}${normalizedEndpoint}${normalizedSubpath}`;
  }

  protected get<T>(path: string, options?: { headers?: HttpHeaders; params?: HttpParams }): Observable<T> {
    return this.http.get<T>(this.getFullUrl(path), options).pipe(
      this.applyRetryStrategy()
    );
  }

  protected post<T>(path: string, body: any, options?: { headers?: HttpHeaders; params?: HttpParams }): Observable<T> {
    return this.http.post<T>(this.getFullUrl(path), body, options).pipe(
      this.applyRetryStrategy()
    );
  }

  protected put<T>(path: string, body: any, options?: { headers?: HttpHeaders; params?: HttpParams }): Observable<T> {
    return this.http.put<T>(this.getFullUrl(path), body, options).pipe(
      this.applyRetryStrategy()
    );
  }

  protected delete<T>(path: string, options?: { headers?: HttpHeaders; params?: HttpParams }): Observable<T> {
    return this.http.delete<T>(this.getFullUrl(path), options).pipe(
      this.applyRetryStrategy()
    );
  }

  protected patch<T>(path: string, body: any, options?: { headers?: HttpHeaders; params?: HttpParams }): Observable<T> {
    return this.http.patch<T>(this.getFullUrl(path), body, options).pipe(
      this.applyRetryStrategy()
    );
  }

  /**
   * Applies a retry strategy for transient errors (connection loss, HTTP status 0 or 5xx server errors).
   * It performs up to 3 retry attempts with exponential backoff delay.
   */
  private applyRetryStrategy() {
    return retry<any>({
      count: 3,
      delay: (error, retryCount) => {
        const isTransient = error.status === 0 || (error.status >= 500 && error.status <= 599);
        if (!isTransient) {
          throw error;
        }
        const backoffMs = Math.pow(2, retryCount) * 1000;
        console.warn(`[BaseApiRepository] Retry attempt ${retryCount} for transient error. Retrying in ${backoffMs}ms...`, error);
        return new Observable(sub => {
          const timer = setTimeout(() => {
            sub.next(true);
            sub.complete();
          }, backoffMs);
          return () => clearTimeout(timer);
        });
      }
    });
  }
}
