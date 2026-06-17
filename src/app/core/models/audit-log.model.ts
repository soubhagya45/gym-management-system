export interface AuditLog {
  id: string;
  userId: string;
  role: string;
  action: string;
  entityType: string;
  entityId: string;
  timestamp: string;
  gymId: string;
}
