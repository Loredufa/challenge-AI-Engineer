import { Router } from 'express'
import { FeedbackController } from '@application/controllers/feedback.controller'
import { authMiddleware } from '@application/middleware/auth.middleware'
import { JWTAdapter } from '@infrastructure/adapters/jwt.adapter'

export function createFeedbackRouter(
  feedbackController: FeedbackController,
  jwtAdapter: JWTAdapter,
): Router {
  const router = Router()
  const auth = authMiddleware(jwtAdapter)

  router.post('/feedback', auth, feedbackController.submit)

  return router
}
