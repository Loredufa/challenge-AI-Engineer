import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { FeedbackService } from '@domain/services/feedback.service'

const submitFeedbackSchema = z.object({
  interaction_id: z.string().uuid(),
  rating: z.enum(['APPROVED', 'REJECTED', 'NEUTRAL']),
  comment: z.string().max(2000).optional(),
})

export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  /** POST /api/v1/feedback — Records user feedback (APPROVED / REJECTED / NEUTRAL) for a given AI interaction. Each interaction can only be rated once per user. */
  submit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = res.locals.userId as string
      const correlationId = res.locals.correlationId as string
      const requestId = res.locals.requestId as string
      const { interaction_id, rating, comment } = submitFeedbackSchema.parse(req.body)

      const feedback = await this.feedbackService.submit({
        interactionId: interaction_id,
        userId,
        rating,
        comment,
        correlationId,
        requestId,
      })

      res.status(201).json({
        feedback_id: feedback.id,
        interaction_id: feedback.interactionId,
        rating: feedback.rating,
        created_at: feedback.createdAt,
      })
    } catch (err) {
      next(err)
    }
  }
}
