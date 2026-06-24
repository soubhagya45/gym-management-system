import { Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import { IImportConnector, ConnectorValidationResult } from '../../core/interfaces/import-connector.interface';
import * as XLSX from 'xlsx';

export class FileImportConnector implements IImportConnector {
  private parsedData: any[] = [];

  connect(config: { file: File }): Observable<void> {
    if (!config.file) {
      return throwError(() => new Error('No file provided to FileImportConnector.'));
    }

    const file = config.file;
    return new Observable<void>(subscriber => {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array', cellDates: true });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
          this.parsedData = jsonData;
          subscriber.next();
          subscriber.complete();
        } catch (err: any) {
          subscriber.error(new Error(err.message || 'Excel/CSV parsing failed.'));
        }
      };
      reader.onerror = () => subscriber.error(new Error('File reading error.'));
      reader.readAsArrayBuffer(file);
    });
  }

  fetchData(): Observable<any[]> {
    return of(this.parsedData);
  }

  validate(data: any[]): Observable<ConnectorValidationResult> {
    const isValid = data.length > 0;
    const errors = data.length === 0 ? [{ row: 0, field: 'file', message: 'The uploaded file is empty.', severity: 'error' as const }] : [];
    
    return of({
      isValid,
      errors,
      summary: {
        totalRows: data.length,
        validRows: data.length - (isValid ? 0 : 1),
        errorRows: isValid ? 0 : 1,
        warningRows: 0
      }
    });
  }
}

export class GoogleSheetsImportConnector implements IImportConnector {
  connect(config: any): Observable<void> {
    console.log('GoogleSheetsImportConnector: Connecting...');
    return of(undefined).pipe(delay(200));
  }
  fetchData(): Observable<any[]> { return of([]); }
  validate(data: any[]): Observable<ConnectorValidationResult> {
    return of({ isValid: true, errors: [], summary: { totalRows: 0, validRows: 0, errorRows: 0, warningRows: 0 } });
  }
}

export class ZohoBooksImportConnector implements IImportConnector {
  connect(config: any): Observable<void> {
    console.log('ZohoBooksImportConnector: Connecting...');
    return of(undefined).pipe(delay(200));
  }
  fetchData(): Observable<any[]> { return of([]); }
  validate(data: any[]): Observable<ConnectorValidationResult> {
    return of({ isValid: true, errors: [], summary: { totalRows: 0, validRows: 0, errorRows: 0, warningRows: 0 } });
  }
}

export class TallyImportConnector implements IImportConnector {
  connect(config: any): Observable<void> {
    console.log('TallyImportConnector: Connecting...');
    return of(undefined).pipe(delay(200));
  }
  fetchData(): Observable<any[]> { return of([]); }
  validate(data: any[]): Observable<ConnectorValidationResult> {
    return of({ isValid: true, errors: [], summary: { totalRows: 0, validRows: 0, errorRows: 0, warningRows: 0 } });
  }
}

export class RESTImportConnector implements IImportConnector {
  connect(config: any): Observable<void> {
    console.log('RESTImportConnector: Connecting...');
    return of(undefined).pipe(delay(200));
  }
  fetchData(): Observable<any[]> { return of([]); }
  validate(data: any[]): Observable<ConnectorValidationResult> {
    return of({ isValid: true, errors: [], summary: { totalRows: 0, validRows: 0, errorRows: 0, warningRows: 0 } });
  }
}
