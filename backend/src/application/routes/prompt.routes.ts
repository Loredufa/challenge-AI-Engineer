import { Router } from 'express'
import { PromptController } from '@application/controllers/prompt.controller'
import { authMiddleware } from '@application/middleware/auth.middleware'
import { JWTAdapter } from '@infrastructure/adapters/jwt.adapter'

export function createPromptRouter(
  promptController: PromptController,
  jwtAdapter: JWTAdapter,
): Router {
  const router = Router()
  const auth = authMiddleware(jwtAdapter)

  router.get('/prompts/:name', auth, promptController.list)
  router.post('/prompts', auth, promptController.create)
  router.post('/prompts/:id/activate', auth, promptController.activate)
  router.post('/prompts/:id/deprecate', auth, promptController.deprecate)

  return router
}
