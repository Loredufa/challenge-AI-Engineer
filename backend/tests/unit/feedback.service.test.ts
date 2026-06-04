import { v4 as uuidv4 } from 'uuid'
import { FeedbackService } from '../../src/domain/services/feedback.service'
import { IFeedbackRepository } from '../../src/domain/repositories/feedback.repository'
import { IAIInteractionRepository } from '../../src/domain/repositories/ai-interaction.repository'
import { AuditService } from '../../src/domain/services/audit.service'
import { Feedback } from '../../src/domain/entities/feedback.entity'
import { AIInteraction } from '../../src/domain/entities/ai-interaction.entity'

function makeFeedback(overrides: Partial<Feedback> = {}): Feedback {
  return {
    id: uuidv4(),
    interactionId: 'interaction-1',
    userId: 'user-1',
    rating: 'APPROVED',
    comment: null,
    createdAt: new Date(),
    ...overrides,
  }
}

function makeInteraction(overrides: Partial<AIInteraction> = {}): AIInteraction {
  return {
    id: 'interaction-1',
    userId: 'user-1',
    correlationId: 'corr-1',
    requestId: 'req-1',
    question: 'What is the deadline?',
    promptVersionId: null,
    model: 'mock-gpt',
    promptTokens: 100,
    completionTokens: 50,
    costUsd: 0,
    latencyMs: 120,
    response: 'The deadline is 30 days.',
    confidenceScore: 0.85,
    topSimilarityScore: 0.85,
    retrievedChunkIds: [],
    inputGuardResult: 'ALLOWED',
    outputGuardResult: 'ALLOWED',
    rejectionReason: null,
    status: 'COMPLETED',
    createdAt: new Date(),
    ...overrides,
  }
}

describe('FeedbackService', () => {
  let feedbackRepo: jest.Mocked<IFeedbackRepository>
  let interactionRepo: jest.Mocked<IAIInteractionRepository>
  let auditService: jest.Mocked<Pick<AuditService, 'emit'>>
  let service: FeedbackService

  beforeEach(() => {
    feedbackRepo = {
      create: jest.fn(),
      findByInteraction: jest.fn(),
      findByUser: jest.fn(),
    }

    interactionRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findByUser: jest.fn(),
    }

    auditService = {
      emit: jest.fn(),
    }

    service = new FeedbackService(
      feedbackRepo,
      interactionRepo,
      auditService as unknown as AuditService,
    )
  })

  describe('submit()', () => {
    const defaultParams = {
      interactionId: 'interaction-1',
      userId: 'user-1',
      rating: 'APPROVED' as const,
      correlationId: uuidv4(),
      requestId: uuidv4(),
    }

    it('submits feedback successfully', async () => {
      const interaction = makeInteraction()
      const feedback = makeFeedback()

      interactionRepo.findById.mockResolvedValue(interaction)
      feedbackRepo.findByInteraction.mockResolvedValue(null)
      feedbackRepo.create.mockResolvedValue(feedback)

      const result = await service.submit(defaultParams)

      expect(result).toEqual(feedback)
      expect(feedbackRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          interactionId: 'interaction-1',
          userId: 'user-1',
          rating: 'APPROVED',
          comment: null,
        })
      )
      expect(auditService.emit).toHaveBeenCalledWith(
        'FEEDBACK_SUBMITTED',
        expect.objectContaining({ userId: 'user-1' })
      )
    })

    it('throws NotFoundError when interaction not found', async () => {
      interactionRepo.findById.mockResolvedValue(null)

      await expect(service.submit(defaultParams)).rejects.toMatchObject({
        code: 'NOT_FOUND',
      })
    })

    it('throws ForbiddenError when interaction belongs to different user', async () => {
      const interaction = makeInteraction({ userId: 'other-user' })
      interactionRepo.findById.mockResolvedValue(interaction)

      await expect(service.submit(defaultParams)).rejects.toMatchObject({
        code: 'FORBIDDEN',
      })
    })

    it('throws ConflictError when feedback already exists', async () => {
      const interaction = makeInteraction()
      const existingFeedback = makeFeedback()

      interactionRepo.findById.mockResolvedValue(interaction)
      feedbackRepo.findByInteraction.mockResolvedValue(existingFeedback)

      await expect(service.submit(defaultParams)).rejects.toMatchObject({
        code: 'CONFLICT',
      })
    })

    it('stores comment when provided', async () => {
      const interaction = makeInteraction()
      const feedback = makeFeedback({ comment: 'Great answer!' })

      interactionRepo.findById.mockResolvedValue(interaction)
      feedbackRepo.findByInteraction.mockResolvedValue(null)
      feedbackRepo.create.mockResolvedValue(feedback)

      await service.submit({ ...defaultParams, comment: 'Great answer!' })

      expect(feedbackRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ comment: 'Great answer!' })
      )
    })
  })
})
