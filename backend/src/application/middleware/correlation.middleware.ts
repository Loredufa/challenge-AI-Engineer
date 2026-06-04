import { Request, Response, NextFunction } from 'express'
import { generateCorrelationId, generateRequestId } from '@shared/correlation'
import logger from '@shared/logger'

export function correlationMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const correlationId = generateCorrelationId(
    req.headers['x-correlation-id'] as string | undefined
  )
  const requestId = generateRequestId()

  res.locals.correlationId = correlationId
  res.locals.requestId = requestId

  res.setHeader('x-correlation-id', correlationId)
  res.setHeader('x-request-id', requestId)

  req.log = logger.child({ correlation_id: correlationId, request_id: requestId })

  next()
}

declare global {
  namespace Express {
    interface Request {
      log: typeof logger
    }
  }
}
