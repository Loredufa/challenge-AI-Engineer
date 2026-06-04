import './shared/env' // validates env vars at startup — must be first import
import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import compression from 'compression'
import { env } from '@shared/env'
import logger from '@shared/logger'
import { correlationMiddleware } from '@application/middleware/correlation.middleware'
import { errorMiddleware } from '@application/middleware/error.middleware'
import { createAuthRouter } from '@application/routes/auth.routes'
import { createDocumentRouter } from '@application/routes/document.routes'
import { createChatRouter } from '@application/routes/chat.routes'
import { createFeedbackRouter } from '@application/routes/feedback.routes'
import { createPromptRouter } from '@application/routes/prompt.routes'
import {
  authController,
  documentController,
  chatController,
  feedbackController,
  promptController,
  jwtAdapter,
} from '@infrastructure/container'

const app = express()

app.use(helmet())
app.use(cors())
app.use(compression())
app.use(express.json())
app.use(correlationMiddleware)

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version ?? '1.0.0',
  })
})

app.use('/api/v1', createAuthRouter(authController, jwtAdapter))
app.use('/api/v1', createDocumentRouter(documentController, jwtAdapter))
app.use('/api/v1', createChatRouter(chatController, jwtAdapter))
app.use('/api/v1', createFeedbackRouter(feedbackController, jwtAdapter))
app.use('/api/v1', createPromptRouter(promptController, jwtAdapter))

app.use(errorMiddleware)

app.listen(env.PORT, () => {
  logger.info('Server started', { port: env.PORT, env: env.NODE_ENV })
})

export default app
