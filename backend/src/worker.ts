import './shared/env' // validate env vars at startup
import logger from '@shared/logger'
import { env } from '@shared/env'
import { db } from '@infrastructure/database/client'
import { DocumentRepositoryImpl } from '@infrastructure/database/repositories/document.repository.impl'
import { ChunkRepositoryImpl } from '@infrastructure/database/repositories/chunk.repository.impl'
import { EmbeddingRepositoryImpl } from '@infrastructure/database/repositories/embedding.repository.impl'
import { AuditRepositoryImpl } from '@infrastructure/database/repositories/audit.repository.impl'
import { OpenAIEmbeddingAdapter } from '@infrastructure/adapters/openai-embedding.adapter'
import { MockEmbeddingAdapter } from '@infrastructure/adapters/mock-embedding.adapter'
import { S3Adapter } from '@infrastructure/adapters/s3.adapter'
import { PDFParserService } from '@domain/services/pdf-parser.service'
import { DocumentSanitizerService } from '@domain/services/document-sanitizer.service'
import { ChunkerService } from '@domain/services/chunker.service'
import { DocumentService } from '@domain/services/document.service'
import { AuditService } from '@domain/services/audit.service'
import { createRAGWorker } from '@infrastructure/queue/rag.queue'
import { createRAGProcessor } from '@infrastructure/queue/rag-processor'
import { IEmbeddingProvider } from '@domain/ports/embedding-provider.port'

// Repositories
const documentRepository = new DocumentRepositoryImpl(db)
const chunkRepository = new ChunkRepositoryImpl(db)
const embeddingRepository = new EmbeddingRepositoryImpl(db)
const auditRepository = new AuditRepositoryImpl(db)

// Adapters
const embeddingProvider: IEmbeddingProvider =
  env.LLM_PROVIDER === 'mock'
    ? new MockEmbeddingAdapter()
    : new OpenAIEmbeddingAdapter(env.OPENAI_API_KEY)

const s3Adapter = new S3Adapter(env.AWS_REGION, env.S3_BUCKET)

// Domain services
const pdfParserService = new PDFParserService()
const documentSanitizerService = new DocumentSanitizerService()
const chunkerService = new ChunkerService()
const auditService = new AuditService(auditRepository)

const documentService = new DocumentService(
  documentRepository,
  chunkRepository,
  embeddingRepository,
  embeddingProvider,
  pdfParserService,
  documentSanitizerService,
  chunkerService
)

// Processor
const processor = createRAGProcessor(documentService, s3Adapter, auditService)

// Worker
const worker = createRAGWorker(env.REDIS_URL, processor)

worker.on('completed', (job) => {
  logger.info('Job completed', { jobId: job.id })
})

worker.on('failed', (job, err) => {
  logger.error('Job failed', { jobId: job?.id, error: err.message })
})

logger.info('RAG worker started', { concurrency: 5, env: env.NODE_ENV })

// Graceful shutdown
async function shutdown(): Promise<void> {
  logger.info('Worker shutting down...')
  await worker.close()
  await db.end()
  logger.info('Worker shutdown complete')
  process.exit(0)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
