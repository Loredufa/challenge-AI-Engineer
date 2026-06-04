import { v4 as uuidv4 } from 'uuid'
import { AuditEvent, EventType } from '@domain/entities/audit-event.entity'
import { IAuditRepository } from '@domain/repositories/audit.repository'
import logger from '@shared/logger'

export class AuditService {
  private readonly metadata = {
    service: 'documind-api',
    version: process.env.npm_package_version ?? '1.0.0',
    environment: process.env.NODE_ENV ?? 'development',
  }

  constructor(private readonly repo: IAuditRepository) {}

  emit(
    eventName: EventType,
    params: {
      correlationId: string
      requestId: string
      userId?: string | null
      payload?: Record<string, unknown>
    }
  ): void {
    // FIRE AND FORGET — never awaited, never throws
    const event: AuditEvent = {
      eventId: uuidv4(),
      eventName,
      correlationId: params.correlationId,
      requestId: params.requestId,
      userId: params.userId ?? null,
      payload: params.payload ?? {},
      metadata: this.metadata,
      timestamp: new Date(),
    }

    this.repo.create(event).catch((err) => {
      logger.error('Failed to persist audit event', {
        eventId: event.eventId,
        eventName,
        error: err instanceof Error ? err.message : String(err),
      })
    })
  }
}
