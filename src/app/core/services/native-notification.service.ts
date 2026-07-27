import { Injectable, NgZone } from '@angular/core';
import { NativeCapacitorService } from './native-capacitor.service';

@Injectable({
  providedIn: 'root'
})
export class NativeNotificationService {
  private permissionGranted = false;

  constructor(
    private nativeCapacitor: NativeCapacitorService,
    private ngZone: NgZone
  ) {
    this.requestPermission();
  }

  public async requestPermission(): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    // Check if Capacitor LocalNotifications plugin is available
    const LocalNotifications = (window as any).Capacitor?.Plugins?.LocalNotifications;
    if (LocalNotifications) {
      try {
        const res = await LocalNotifications.requestPermissions();
        this.permissionGranted = res.display === 'granted';
        return this.permissionGranted;
      } catch (err) {
        console.warn('Capacitor LocalNotifications permission request failed:', err);
      }
    }

    // Web Notification API fallback
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        this.permissionGranted = true;
      } else if (Notification.permission !== 'denied') {
        const perm = await Notification.requestPermission();
        this.permissionGranted = perm === 'granted';
      }
    }

    return this.permissionGranted;
  }

  public async sendNotification(title: string, body: string, id: number = Math.floor(Math.random() * 10000)): Promise<void> {
    this.nativeCapacitor.triggerHaptic('medium');

    const LocalNotifications = (window as any).Capacitor?.Plugins?.LocalNotifications;
    if (LocalNotifications && this.permissionGranted) {
      try {
        await LocalNotifications.schedule({
          notifications: [
            {
              title,
              body,
              id,
              schedule: { at: new Date(Date.now() + 500) },
              smallIcon: 'ic_stat_name',
              iconColor: '#6366F1'
            }
          ]
        });
        return;
      } catch (err) {
        console.warn('Capacitor LocalNotifications schedule failed:', err);
      }
    }

    // Web Notification API fallback
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, { body, icon: '/favicon.ico' });
      } catch (e) {
        console.warn('Web notification failed:', e);
      }
    }
  }

  public async scheduleExpiryReminder(memberName: string, daysRemaining: number): Promise<void> {
    const title = 'Membership Expiring Soon ⏳';
    const body = `${memberName}'s subscription expires in ${daysRemaining} day${daysRemaining > 1 ? 's' : ''}. Tap to renew.`;
    await this.sendNotification(title, body);
  }

  public async schedulePaymentDueAlert(memberName: string, amount: number): Promise<void> {
    const title = 'Payment Due Notice 💳';
    const body = `Outstanding balance of ₹${amount} pending for ${memberName}.`;
    await this.sendNotification(title, body);
  }
}
