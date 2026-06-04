import { Request, Response, NextFunction } from 'express'
import { JWTAdapter } from '@infrastructure/adapters/jwt.adapter'
import { UnauthorizedError } from '@shared/errors'

export function authMiddleware(jwtAdapter: JWTAdapter) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) {
      return next(new UnauthorizedError('Token required'))
    }
    try {
      const claims = jwtAdapter.verify(token)
      res.locals.userId = claims.sub
      res.locals.userEmail = claims.email
      next()
    } catch (err) {
      next(err)
    }
  }
}
