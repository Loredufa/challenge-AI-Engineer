import { Router } from 'express'
import { AuthController, requestOTPSchema, verifyOTPSchema, refreshSchema } from '@application/controllers/auth.controller'
import { validateMiddleware } from '@application/middleware/validation.middleware'
import { authMiddleware } from '@application/middleware/auth.middleware'
import { JWTAdapter } from '@infrastructure/adapters/jwt.adapter'

export function createAuthRouter(
  authController: AuthController,
  jwtAdapter: JWTAdapter
): Router {
  const router = Router()

  router.post(
    '/auth/request-otp',
    validateMiddleware(requestOTPSchema),
    authController.requestOTP
  )

  router.post(
    '/auth/verify-otp',
    validateMiddleware(verifyOTPSchema),
    authController.verifyOTP
  )

  router.post(
    '/auth/refresh',
    validateMiddleware(refreshSchema),
    authController.refresh
  )

  router.post(
    '/auth/logout',
    authMiddleware(jwtAdapter),
    validateMiddleware(refreshSchema),
    authController.logout
  )

  return router
}
