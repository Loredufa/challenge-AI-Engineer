import { Request, Response, NextFunction } from 'express'
import { AppError } from '@shared/errors'
import logger from '@shared/logger'

export function errorMiddleware(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const requestId = res.locals.requestId as string | undefined

  if (err instanceof AppError) {
    const body: Record<string, unknown> = {
      error: {
        code: err.code,
        message: err.message,
        request_id: requestId,
      },
    }

    // Include validation details when present
    if ('details' in err && err.details !== undefined) {
      (body.error as Record<string, unknown>).details = err.details
    }

    res.status(err.statusCode).json(body)
    return
  }

  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    request_id: requestId,
  })

  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred.',
      request_id: requestId,
    },
  })
}
