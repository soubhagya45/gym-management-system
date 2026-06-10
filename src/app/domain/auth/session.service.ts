import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { Subject, BehaviorSubject, Subscription, fromEvent, merge } from 'rxjs';
import { throttleTime, filter } from 'rxjs/operators';

const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;  // 8 hours
const IDLE_WARNING_MS = 7 * 60 * 60 * 1000;  // warn 1h before expiry
const ACTIVITY_THROTTLE_MS = 60_000;              // re-check at most once per minute

/**
 * SessionService
 *
 * Manages the authenticated session lifecycle:
 * - Starts/stops an expiry timer on login/logout
 * - Listens to user activity (mouse/keyboard) to reset the clock
 * - Emits `sessionExpired$` when the session lapses — AuthState subscribes and logs out
 * - Emits `sessionWarning$` 1h before expiry so the UI can show a countdown
 */
@Injectable({ providedIn: 'root' })
export class SessionService implements OnDestroy {

  /** Fires once when the session expires. */
  readonly sessionExpired$ = new Subject<void>();

  /** Fires when < 1 hour remains (milliseconds remaining). */
  readonly sessionWarning$ = new BehaviorSubject<number | null>(null);

  /** Whether a session is currently active. */
  readonly isActive$ = new BehaviorSubject<boolean>(false);

  private expiresAt: number | null = null;
  private expiryTimer: ReturnType<typeof setTimeout> | null = null;
  private warningTimer: ReturnType<typeof setTimeout> | null = null;
  private activitySub: Subscription | null = null;

  constructor(private zone: NgZone) { }

  /** Call on successful login — starts the session clock. */
  start(expiresAtIso?: string): void {
    this.stop();

    const now = Date.now();
    this.expiresAt = expiresAtIso
      ? new Date(expiresAtIso).getTime()
      : now + SESSION_DURATION_MS;

    if (this.expiresAt <= now) {
      // Restored session already expired
      this.sessionExpired$.next();
      return;
    }

    this.isActive$.next(true);
    this.scheduleTimers();
    this.listenToActivity();
  }

  /** Call on logout — clears all timers and subscriptions. */
  stop(): void {
    if (this.expiryTimer) clearTimeout(this.expiryTimer);
    if (this.warningTimer) clearTimeout(this.warningTimer);
    this.activitySub?.unsubscribe();
    this.expiresAt = null;
    this.isActive$.next(false);
    this.sessionWarning$.next(null);
  }

  /** Returns the ISO timestamp when the session will expire. */
  getExpiresAt(): string | null {
    return this.expiresAt ? new Date(this.expiresAt).toISOString() : null;
  }

  /** Returns true if the session timestamp is still in the future. */
  isSessionValid(): boolean {
    if (!this.expiresAt) return false;
    return Date.now() < this.expiresAt;
  }

  /** Returns remaining milliseconds, or 0 if expired. */
  getTimeRemaining(): number {
    if (!this.expiresAt) return 0;
    return Math.max(0, this.expiresAt - Date.now());
  }

  /** Resets the session to a full SESSION_DURATION_MS from now. */
  resetTimer(): void {
    if (!this.expiresAt) return;
    this.expiresAt = Date.now() + SESSION_DURATION_MS;
    if (this.expiryTimer) clearTimeout(this.expiryTimer);
    if (this.warningTimer) clearTimeout(this.warningTimer);
    this.scheduleTimers();
  }

  private scheduleTimers(): void {
    const remaining = this.getTimeRemaining();
    const warnAfter = remaining - (SESSION_DURATION_MS - IDLE_WARNING_MS);

    // Schedule expiry
    this.expiryTimer = setTimeout(() => {
      this.zone.run(() => {
        this.isActive$.next(false);
        this.sessionExpired$.next();
      });
    }, remaining);

    // Schedule warning if meaningful time remains
    if (warnAfter > 0) {
      this.warningTimer = setTimeout(() => {
        this.zone.run(() => this.sessionWarning$.next(this.getTimeRemaining()));
      }, warnAfter);
    } else {
      // Already inside warning window
      this.sessionWarning$.next(remaining);
    }
  }

  private listenToActivity(): void {
    this.activitySub?.unsubscribe();

    const activity$ = merge(
      fromEvent(document, 'mousemove'),
      fromEvent(document, 'keydown'),
      fromEvent(document, 'click'),
      fromEvent(document, 'touchstart')
    ).pipe(throttleTime(ACTIVITY_THROTTLE_MS));

    this.activitySub = activity$.subscribe(() => {
      this.zone.run(() => this.resetTimer());
    });
  }

  ngOnDestroy(): void {
    this.stop();
    this.sessionExpired$.complete();
    this.sessionWarning$.complete();
    this.isActive$.complete();
  }
}
