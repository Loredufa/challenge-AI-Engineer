import { Pool } from 'pg'
import { IAuditRepository } from '@domain/repositories/audit.repository'
import { AuditEvent } from '@domain/entities/audit-event.entity'
import { EventType } from '@domain/entities/audit-event.entity'

function rowToAuditEvent(row: Record<string, unknown>): AuditEvent {
  return {
    eventId: row.event_id as string,
    eventName: row.event_name as EventType,
    correlationId: row.correlation_id as string,
    requestId: row.request_id as string,
    userId: row.user_id as string | null,
    payload: row.payload as Record<string, unknown>,
    metadata: row.metadata as { service: string; version: string; environment: string },
    timestamp: row.timestamp as Date,
  }
}

export class AuditRepositoryImpl implements IAuditRepository {
  constructor(private readonly pool: Pool) {}

  async create(event: AuditEvent): Promise<void> {
    await this.pool.query(
      `INSERT INTO audit_events (event_id, event_name, correlation_id, request_id, user_id, payload, metadata, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (event_id) DO NOTHING`,
      [
        event.eventId,
        event.eventName,
        event.correlationId,
        event.requestId,
        event.userId ?? null,
        JSON.stringify(event.payload),
        JSON.stringify(event.metadata),
        event.timestamp,
      ]
    )
  }

  async findByCorrelationId(correlationId: string): Promise<AuditEvent[]> {
    const { rows } = await this.pool.query(
      'SELECT * FROM audit_events WHERE correlation_id = $1 ORDER BY timestamp ASC',
      [correlationId]
    )
    return rows.map(rowToAuditEvent)
  }

  async findByUserId(userId: string, limit = 100): Promise<AuditEvent[]> {
    const { rows } = await this.pool.query(
      'SELECT * FROM audit_events WHERE user_id = $1 ORDER BY timestamp DESC LIMIT $2',
      [userId, limit]
    )
    return rows.map(rowToAuditEvent)
  }
}
