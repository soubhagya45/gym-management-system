import { Observable } from 'rxjs';

export interface ConnectorValidationError {
  row: number;
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ConnectorValidationResult {
  isValid: boolean;
  errors: ConnectorValidationError[];
  summary: {
    totalRows: number;
    validRows: number;
    errorRows: number;
    warningRows: number;
  };
}

export interface IImportConnector {
  connect(config: any): Observable<void>;
  fetchData(): Observable<any[]>;
  validate(data: any[]): Observable<ConnectorValidationResult>;
}
