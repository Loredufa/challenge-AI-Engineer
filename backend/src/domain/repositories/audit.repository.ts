import { AuditEvent } from '@domain/entities/audit-event.entity'

export interface IAuditRepository {
  create(event: AuditEvent): Promise<void>
  findByCorrelationId(correlationId: string): Promise<AuditEvent[]>
  findByUserId(userId: string, limit?: number): Promise<AuditEvent[]>
}
