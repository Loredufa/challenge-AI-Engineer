import { db } from '@infrastructure/database/client'
import { UserRepositoryImpl } from '@infrastructure/database/repositories/user.repository.impl'
import { OTPRepositoryImpl } from '@infrastructure/database/repositories/otp.repository.impl'
import { RefreshTokenRepositoryImpl } from '@infrastructure/database/repositories/refresh-token.repository.impl'
import { DocumentRepositoryImpl } from '@infrastructure/database/repositories/document.repository.impl'
import { ChunkRepositoryImpl } from '@infrastructure/database/repositories/chunk.repository.impl'
import { EmbeddingRepositoryImpl } from '@infrastructure/database/repositories/embedding.repository.impl'
import { PromptVersionRepositoryImpl } from '@infrastructure/database/repositories/prompt-version.repository.impl'
import { AIInteractionRepositoryImpl } from '@infrastructure/database/repositories/ai-interaction.repository.impl'
import { AuditRepositoryImpl } from '@infrastructure/database/repositories/audit.repository.impl'
import { FeedbackRepositoryImpl } from '@infrastructure/database/repositories/feedback.repository.impl'
import { JWTAdapter } from '@infrastructure/adapters/jwt.adapter'
import { ConsoleEmailAdapter, ResendEmailAdapter, SESEmailAdapter } from '@infrastructure/adapters/email.adapter'
import { OpenAIEmbeddingAdapter } from '@infrastructure/adapters/openai-embedding.adapter'
import { MockEmbeddingAdapter } from '@infrastructure/adapters/mock-embedding.adapter'
import { OpenAILLMAdapter } from '@infrastructure/adapters/openai-llm.adapter'
import { AnthropicLLMAdapter } from '@infrastructure/adapters/anthropic-llm.adapter'
import { MockLLMAdapter } from '@infrastructure/adapters/mock-llm.adapter'
import { S3Adapter } from '@infrastructure/adapters/s3.adapter'
import { AuthService } from '@domain/services/auth.service'
import { DocumentService } from '@domain/services/document.service'
import { PDFParserService } from '@domain/services/pdf-parser.service'
import { DocumentSanitizerService } from '@domain/services/document-sanitizer.service'
import { ChunkerService } from '@domain/services/chunker.service'
import { InputGuardService } from '@domain/services/input-guard.service'
import { OutputGuardService } from '@domain/services/output-guard.service'
import { ContextAssemblerService } from '@domain/services/context-assembler.service'
import { PromptBuilderService } from '@domain/services/prompt-builder.service'
import { RAGService } from '@domain/services/rag.service'
import { AuditService } from '@domain/services/audit.service'
import { FeedbackService } from '@domain/services/feedback.service'
import { AuthController } from '@application/controllers/auth.controller'
import { DocumentController } from '@application/controllers/document.controller'
import { ChatController } from '@application/controllers/chat.controller'
import { FeedbackController } from '@application/controllers/feedback.controller'
import { PromptController } from '@application/controllers/prompt.controller'
import { createRAGQueue } from '@infrastructure/queue/rag.queue'
import { env } from '@shared/env'
import { IEmailProvider } from '@domain/ports/email-provider.port'
import { IEmbeddingProvider } from '@domain/ports/embedding-provider.port'
import { ILLMProvider } from '@domain/ports/llm-provider.port'

// Repositories
const userRepository = new UserRepositoryImpl(db)
const otpRepository = new OTPRepositoryImpl(db)
const refreshTokenRepository = new RefreshTokenRepositoryImpl(db)
const documentRepository = new DocumentRepositoryImpl(db)
const chunkRepository = new ChunkRepositoryImpl(db)
const embeddingRepository = new EmbeddingRepositoryImpl(db)
export const promptVersionRepository = new PromptVersionRepositoryImpl(db)
const aiInteractionRepository = new AIInteractionRepositoryImpl(db)
const auditRepository = new AuditRepositoryImpl(db)
const feedbackRepository = new FeedbackRepositoryImpl(db)

// Adapters
export const jwtAdapter = new JWTAdapter()

const emailProvider: IEmailProvider =
  env.EMAIL_PROVIDER === 'ses'
    ? new SESEmailAdapter('no-reply@documind.ai')
    : env.EMAIL_PROVIDER === 'resend'
      ? new ResendEmailAdapter(env.RESEND_API_KEY!, env.RESEND_FROM)
      : new ConsoleEmailAdapter()

const embeddingProvider: IEmbeddingProvider =
  env.LLM_PROVIDER === 'mock'
    ? new MockEmbeddingAdapter()
    : new OpenAIEmbeddingAdapter(env.OPENAI_API_KEY)

const llmProvider: ILLMProvider = (() => {
  const apiKey = env.LLM_API_KEY ?? env.OPENAI_API_KEY
  switch (env.LLM_PROVIDER) {
    case 'anthropic':
      return new AnthropicLLMAdapter(apiKey, env.LLM_MODEL)
    case 'openai-compatible':
      return new OpenAILLMAdapter(apiKey, env.LLM_MODEL ?? 'gpt-4o', env.LLM_BASE_URL)
    case 'openai':
      return new OpenAILLMAdapter(apiKey, env.LLM_MODEL ?? 'gpt-4o')
    default:
      return new MockLLMAdapter()
  }
})()

export const s3Adapter = new S3Adapter(env.AWS_REGION, env.S3_BUCKET)

// Audit service (shared)
const auditService = new AuditService(auditRepository)

// Domain services
const pdfParserService = new PDFParserService()
const documentSanitizerService = new DocumentSanitizerService()
const chunkerService = new ChunkerService()
const inputGuardService = new InputGuardService()
const outputGuardService = new OutputGuardService()
const contextAssemblerService = new ContextAssemblerService()
const promptBuilderService = new PromptBuilderService(promptVersionRepository)

const authService = new AuthService(
  userRepository,
  otpRepository,
  refreshTokenRepository,
  jwtAdapter,
  emailProvider,
  auditService,
)

const documentService = new DocumentService(
  documentRepository,
  chunkRepository,
  embeddingRepository,
  embeddingProvider,
  pdfParserService,
  documentSanitizerService,
  chunkerService,
  s3Adapter
)

const ragService = new RAGService(
  inputGuardService,
  outputGuardService,
  embeddingProvider,
  embeddingRepository,
  contextAssemblerService,
  promptBuilderService,
  llmProvider,
  aiInteractionRepository,
  auditService,
)

const feedbackService = new FeedbackService(
  feedbackRepository,
  aiInteractionRepository,
  auditService,
)

// BullMQ
export const ragQueue = createRAGQueue(env.REDIS_URL)

// Controllers
export const authController = new AuthController(authService)
export const documentController = new DocumentController(documentService, s3Adapter, ragQueue, auditService)
export const chatController = new ChatController(ragService)
export const feedbackController = new FeedbackController(feedbackService)
export const promptController = new PromptController(promptVersionRepository)
