import { Feedback, FeedbackRating } from '@domain/entities/feedback.entity'
import { IFeedbackRepository } from '@domain/repositories/feedback.repository'
import { IAIInteractionRepository } from '@domain/repositories/ai-interaction.repository'
import { AuditService } from '@domain/services/audit.service'
import { NotFoundError, ForbiddenError, ConflictError } from '@shared/errors'

export class FeedbackService {
  constructor(
    private readonly feedbackRepo: IFeedbackRepository,
    private readonly interactionRepo: IAIInteractionRepository,
    private readonly auditService: AuditService,
  ) {}

  async submit(params: {
    interactionId: string
    userId: string
    rating: FeedbackRating
    comment?: string
    correlationId: string
    requestId: string
  }): Promise<Feedback> {
    // 1. Verify interaction exists and belongs to the user
    const interaction = await this.interactionRepo.findById(params.interactionId)
    if (!interaction) throw new NotFoundError('Interaction not found')
    if (interaction.userId !== params.userId) throw new ForbiddenError('Not your interaction')

    // 2. Verify no duplicate feedback
    const existing = await this.feedbackRepo.findByInteraction(params.interactionId)
    if (existing) throw new ConflictError('Feedback already submitted for this interaction')

    // 3. Persist
    const feedback = await this.feedbackRepo.create({
      interactionId: params.interactionId,
      userId: params.userId,
      rating: params.rating,
      comment: params.comment ?? null,
    })

    // 4. Audit (fire-and-forget)
    this.auditService.emit('FEEDBACK_SUBMITTED', {
      correlationId: params.correlationId,
      requestId: params.requestId,
      userId: params.userId,
      payload: {
        feedbackId: feedback.id,
        interactionId: params.interactionId,
        rating: params.rating,
        hasComment: !!params.comment,
      },
    })

    return feedback
  }
}
