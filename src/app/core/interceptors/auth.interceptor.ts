import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    let token = localStorage.getItem('apexfit_token');

    if (!token) {
      const savedUser = localStorage.getItem('apexfit_auth_user');
      if (savedUser) {
        try {
          const user = JSON.parse(savedUser);
          token = user.token || user.id; // fallback to user.id if no explicit token is saved
        } catch (e) {
          console.error('[AuthInterceptor] Failed to parse auth user session from storage', e);
        }
      }
    }

    if (token) {
      const cloned = req.clone({
        headers: req.headers.set('Authorization', `Bearer ${token}`)
      });
      return next.handle(cloned);
    }

    return next.handle(req);
  }
}
