import { v4 as uuidv4 } from 'uuid'

// Mock winston logger to avoid transitive dependency issues in jest
jest.mock('../../src/shared/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}))

import { AuditService } from '../../src/domain/services/audit.service'
import { IAuditRepository } from '../../src/domain/repositories/audit.repository'

describe('AuditService', () => {
  it('calls repository create without awaiting', () => {
    const mockRepo: jest.Mocked<IAuditRepository> = {
      create: jest.fn().mockResolvedValue(undefined),
      findByCorrelationId: jest.fn(),
      findByUserId: jest.fn(),
    }
    const service = new AuditService(mockRepo)

    service.emit('OTP_REQUESTED', {
      correlationId: uuidv4(),
      requestId: uuidv4(),
      userId: uuidv4(),
      payload: { email: 'test@test.com' },
    })

    // No throw, no await needed
    expect(mockRepo.create).toHaveBeenCalledTimes(1)
  })

  it('does not throw when repository fails', async () => {
    const mockRepo: jest.Mocked<IAuditRepository> = {
      create: jest.fn().mockRejectedValue(new Error('DB down')),
      findByCorrelationId: jest.fn(),
      findByUserId: jest.fn(),
    }
    const service = new AuditService(mockRepo)

    expect(() =>
      service.emit('OTP_REQUESTED', {
        correlationId: uuidv4(),
        requestId: uuidv4(),
      })
    ).not.toThrow()

    // Give async rejection time to be handled
    await new Promise((resolve) => setTimeout(resolve, 10))
    // Should have logged error but not thrown
  })

  it('generates unique eventId for each emit', () => {
    const mockRepo: jest.Mocked<IAuditRepository> = {
      create: jest.fn().mockResolvedValue(undefined),
      findByCorrelationId: jest.fn(),
      findByUserId: jest.fn(),
    }
    const service = new AuditService(mockRepo)

    service.emit('OTP_REQUESTED', { correlationId: 'x', requestId: 'y' })
    service.emit('OTP_REQUESTED', { correlationId: 'x', requestId: 'y' })

    const calls = mockRepo.create.mock.calls
    expect(calls[0][0].eventId).not.toEqual(calls[1][0].eventId)
  })

  it('sets correct eventName, correlationId, requestId and userId in the event', () => {
    const mockRepo: jest.Mocked<IAuditRepository> = {
      create: jest.fn().mockResolvedValue(undefined),
      findByCorrelationId: jest.fn(),
      findByUserId: jest.fn(),
    }
    const service = new AuditService(mockRepo)
    const correlationId = uuidv4()
    const requestId = uuidv4()
    const userId = uuidv4()

    service.emit('USER_CREATED', { correlationId, requestId, userId })

    const event = mockRepo.create.mock.calls[0][0]
    expect(event.eventName).toBe('USER_CREATED')
    expect(event.correlationId).toBe(correlationId)
    expect(event.requestId).toBe(requestId)
    expect(event.userId).toBe(userId)
  })

  it('sets userId to null when not provided', () => {
    const mockRepo: jest.Mocked<IAuditRepository> = {
      create: jest.fn().mockResolvedValue(undefined),
      findByCorrelationId: jest.fn(),
      findByUserId: jest.fn(),
    }
    const service = new AuditService(mockRepo)

    service.emit('OTP_REQUESTED', { correlationId: 'c', requestId: 'r' })

    const event = mockRepo.create.mock.calls[0][0]
    expect(event.userId).toBeNull()
  })
})
