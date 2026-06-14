import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AppConfigService } from '../config/app-config';
import { TenantContextService } from '../../domain/tenancy/tenant-context.service';

@Injectable()
export class ApiInterceptor implements HttpInterceptor {
  constructor(
    private configService: AppConfigService,
    private tenantContext: TenantContextService
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const startTime = Date.now();
    let modifiedReq = req;

    // 1. Centralized API configuration: Prefix relative URLs with apiUrl
    const apiUrl = this.configService.apiUrl;
    if (apiUrl && !req.url.startsWith('http://') && !req.url.startsWith('https://')) {
      const base = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
      const path = req.url.startsWith('/') ? req.url : `/${req.url}`;
      modifiedReq = modifiedReq.clone({ url: `${base}${path}` });
    }

    // 2. Automatic gymId injection: Inject active tenant/gymId if present
    const gymId = this.tenantContext.getTenantId();
    if (gymId) {
      modifiedReq = modifiedReq.clone({
        headers: modifiedReq.headers
          .set('X-Gym-Id', gymId)
          .set('gymId', gymId)
      });
    }

    // 3. Request Logging (Request start)
    console.log(`[API Request] [${modifiedReq.method}] ${modifiedReq.url} | Headers:`, modifiedReq.headers.keys());

    return next.handle(modifiedReq).pipe(
      tap({
        next: (event) => {
          if (event instanceof HttpResponse) {
            const duration = Date.now() - startTime;
            console.log(`[API Response] [${modifiedReq.method}] ${modifiedReq.url} - Status ${event.status} (${duration}ms)`);
          }
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          console.error(`[API Error] [${modifiedReq.method}] ${modifiedReq.url} - Status ${error.status} (${duration}ms) | Message: ${error.message}`);
        }
      })
    );
  }
}
