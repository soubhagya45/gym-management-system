import { Injectable, Injector } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  constructor(private injector: Injector) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        let errorMessage = 'An unexpected error occurred.';

        if (error.error instanceof ErrorEvent) {
          // Client-side or network error
          errorMessage = `Network error: ${error.error.message}`;
        } else {
          // Backend returned an unsuccessful response code
          if (error.status === 401) {
            errorMessage = 'Session expired. Please log in again.';
            this.handleUnauthorized();
          } else if (error.status === 403) {
            errorMessage = 'You do not have permission to perform this action.';
          } else if (error.status === 404) {
            errorMessage = 'Requested resource not found.';
          } else if (error.status >= 500) {
            errorMessage = 'Server error. Please try again later.';
          } else {
            errorMessage = error.error?.message || error.message || errorMessage;
          }
        }

        // Only display toast for non-401 errors
        if (error.status !== 401) {
          this.showNotification(errorMessage);
        }

        return throwError(() => new Error(errorMessage));
      })
    );
  }

  private handleUnauthorized(): void {
    try {
      // Clear authentication items from storage
      localStorage.removeItem('apexfit_auth_user');
      localStorage.removeItem('apexfit_token');

      // Use Injector to dynamically load Router to avoid circular dependencies
      const router = this.injector.get(Router);
      router.navigate(['/login']);
    } catch (e) {
      console.error('[ErrorInterceptor] Failed to redirect on 401', e);
    }
  }

  private showNotification(message: string): void {
    try {
      const snackBar = this.injector.get(MatSnackBar);
      snackBar.open(message, 'Dismiss', {
        duration: 5000,
        panelClass: ['error-snackbar'],
        horizontalPosition: 'end',
        verticalPosition: 'bottom'
      });
    } catch (e) {
      console.warn('[ErrorInterceptor] MatSnackBar not available to show error:', message);
    }
  }
}
