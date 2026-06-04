import { Request, Response, NextFunction } from 'express'
import { AuthService } from '@domain/services/auth.service'
import { z } from 'zod'

export const requestOTPSchema = z.object({
  email: z.string().email(),
})

export const verifyOTPSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6).regex(/^\d+$/, 'OTP must be numeric'),
})

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
})

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** POST /api/v1/auth/request-otp — Sends a one-time password to the given email. Always returns 202 to prevent email enumeration. */
  requestOTP = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email } = req.body as z.infer<typeof requestOTPSchema>
      const ipAddress = req.ip
      const correlationId = res.locals.correlationId as string
      const requestId = res.locals.requestId as string
      await this.authService.requestOTP(email, ipAddress, { correlationId, requestId })
      res.status(202).json({ message: 'OTP sent if email is valid.' })
    } catch (err) {
      next(err)
    }
  }

  /** POST /api/v1/auth/verify-otp — Verifies the OTP and returns a JWT access token (15 min) and a refresh token (7 days). */
  verifyOTP = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, otp } = req.body as z.infer<typeof verifyOTPSchema>
      const correlationId = res.locals.correlationId as string
      const requestId = res.locals.requestId as string
      const tokens = await this.authService.verifyOTP(email, otp, { correlationId, requestId })
      res.status(200).json(tokens)
    } catch (err) {
      next(err)
    }
  }

  /** POST /api/v1/auth/refresh — Issues a new access/refresh token pair given a valid, non-revoked refresh token. */
  refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { refreshToken } = req.body as z.infer<typeof refreshSchema>
      const tokens = await this.authService.refreshTokens(refreshToken)
      res.status(200).json(tokens)
    } catch (err) {
      next(err)
    }
  }

  /** POST /api/v1/auth/logout — Revokes the provided refresh token, invalidating the session. Returns 204. */
  logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { refreshToken } = req.body as z.infer<typeof refreshSchema>
      await this.authService.logout(refreshToken)
      res.status(204).send()
    } catch (err) {
      next(err)
    }
  }
}
