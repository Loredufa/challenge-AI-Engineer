import { Router } from 'express'
import { ChatController } from '@application/controllers/chat.controller'
import { authMiddleware } from '@application/middleware/auth.middleware'
import { JWTAdapter } from '@infrastructure/adapters/jwt.adapter'

export function createChatRouter(chatController: ChatController, jwtAdapter: JWTAdapter): Router {
  const router = Router()
  const auth = authMiddleware(jwtAdapter)

  router.get('/chat/history', auth, chatController.history)
  router.post('/chat/question', auth, chatController.ask)

  return router
}
