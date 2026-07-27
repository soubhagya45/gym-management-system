import { Injectable, ComponentRef } from '@angular/core';
import { MatDialog, MatDialogConfig, MatDialogRef } from '@angular/material/dialog';
import { ComponentType } from '@angular/cdk/portal';
import { Observable } from 'rxjs';
import { ResponsiveLayoutService } from './responsive-layout.service';
import { NativeCapacitorService } from './native-capacitor.service';

@Injectable({
  providedIn: 'root'
})
export class MobileDialogService {
  private activeDialogRef: MatDialogRef<any> | null = null;

  constructor(
    private dialog: MatDialog,
    private responsiveLayout: ResponsiveLayoutService,
    private nativeCapacitor: NativeCapacitorService
  ) {
    this.initBackButtonHandling();
  }

  private initBackButtonHandling(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('capacitorBackButton', () => {
        if (this.activeDialogRef) {
          this.activeDialogRef.close();
          this.activeDialogRef = null;
        }
      });
    }
  }

  public openFormModal<T, D = any, R = any>(
    component: ComponentType<T>,
    config: MatDialogConfig<D> = {}
  ): MatDialogRef<T, R> {
    this.nativeCapacitor.triggerHaptic('light');

    const isMobile = this.responsiveLayout.isMobile;

    const mergedConfig: MatDialogConfig<D> = {
      ...config,
      panelClass: isMobile 
        ? ['mobile-fullscreen-dialog', ...(Array.isArray(config.panelClass) ? config.panelClass : [config.panelClass].filter(Boolean) as string[])]
        : config.panelClass,
      width: isMobile ? '100vw' : (config.width || '640px'),
      height: isMobile ? '100vh' : config.height,
      maxWidth: isMobile ? '100vw' : config.maxWidth,
      maxHeight: isMobile ? '100vh' : config.maxHeight,
      autoFocus: !isMobile
    };

    const dialogRef = this.dialog.open<T, D, R>(component, mergedConfig);
    this.activeDialogRef = dialogRef;

    dialogRef.afterClosed().subscribe(() => {
      if (this.activeDialogRef === dialogRef) {
        this.activeDialogRef = null;
      }
    });

    return dialogRef;
  }

  public openBottomSheet<T, D = any, R = any>(
    component: ComponentType<T>,
    config: MatDialogConfig<D> = {}
  ): MatDialogRef<T, R> {
    this.nativeCapacitor.triggerHaptic('light');

    const isMobile = this.responsiveLayout.isMobile;

    const mergedConfig: MatDialogConfig<D> = {
      ...config,
      panelClass: isMobile 
        ? ['mobile-bottom-sheet', ...(Array.isArray(config.panelClass) ? config.panelClass : [config.panelClass].filter(Boolean) as string[])]
        : config.panelClass,
      width: isMobile ? '100vw' : (config.width || '480px'),
      position: isMobile ? { bottom: '0' } : config.position,
      autoFocus: false
    };

    const dialogRef = this.dialog.open<T, D, R>(component, mergedConfig);
    this.activeDialogRef = dialogRef;

    dialogRef.afterClosed().subscribe(() => {
      if (this.activeDialogRef === dialogRef) {
        this.activeDialogRef = null;
      }
    });

    return dialogRef;
  }
}
