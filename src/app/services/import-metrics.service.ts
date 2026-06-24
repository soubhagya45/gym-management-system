import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface ImportMetrics {
  totalImports: number;
  successfulImports: number;
  failedImports: number;
  recordsImported: number;
  duplicateRecordsPrevented: number;
  rollbackCount: number;
  averageImportDuration: number; // in milliseconds
  processingSpeed: number; // rows per second
  lastImportDate: string | null;
  activeBackgroundJobs: number;
}

@Injectable({
  providedIn: 'root'
})
export class ImportMetricsService {
  private metricsSubject = new BehaviorSubject<ImportMetrics>({
    totalImports: 5, // Seed mock metrics for realistic dashboard display
    successfulImports: 4,
    failedImports: 1,
    recordsImported: 450,
    duplicateRecordsPrevented: 12,
    rollbackCount: 1,
    averageImportDuration: 3400,
    processingSpeed: 132.3,
    lastImportDate: new Date(Date.now() - 86400000).toISOString(), // yesterday
    activeBackgroundJobs: 0
  });

  metrics$: Observable<ImportMetrics> = this.metricsSubject.asObservable();

  get currentMetrics(): ImportMetrics {
    return this.metricsSubject.value;
  }

  incrementImports(status: 'completed' | 'failed') {
    const current = this.metricsSubject.value;
    this.metricsSubject.next({
      ...current,
      totalImports: current.totalImports + 1,
      successfulImports: status === 'completed' ? current.successfulImports + 1 : current.successfulImports,
      failedImports: status === 'failed' ? current.failedImports + 1 : current.failedImports,
      lastImportDate: new Date().toISOString()
    });
  }

  recordImportCompletion(records: number, duplicates: number, duration: number) {
    const current = this.metricsSubject.value;
    const newTotalImported = current.recordsImported + records;
    const newAvgDuration = current.averageImportDuration === 0
      ? duration
      : Math.round((current.averageImportDuration + duration) / 2);
    
    const speed = duration > 0 ? (records / (duration / 1000)) : 0;

    this.metricsSubject.next({
      ...current,
      recordsImported: newTotalImported,
      duplicateRecordsPrevented: current.duplicateRecordsPrevented + duplicates,
      averageImportDuration: newAvgDuration,
      processingSpeed: parseFloat(speed.toFixed(1))
    });
  }

  recordRollback() {
    const current = this.metricsSubject.value;
    this.metricsSubject.next({
      ...current,
      rollbackCount: current.rollbackCount + 1
    });
  }

  setActiveJobs(count: number) {
    const current = this.metricsSubject.value;
    this.metricsSubject.next({
      ...current,
      activeBackgroundJobs: count
    });
  }
}
