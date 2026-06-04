import { Job } from 'bullmq'
import { v4 as uuidv4 } from 'uuid'
import { RAGJobData } from '@infrastructure/queue/rag.queue'
import { DocumentService } from '@domain/services/document.service'
import { S3Adapter } from '@infrastructure/adapters/s3.adapter'
import { AuditService } from '@domain/services/audit.service'
import logger from '@shared/logger'

export function createRAGProcessor(
  documentService: DocumentService,
  s3Adapter: S3Adapter,
  auditService?: AuditService,
) {
  return async (job: Job<RAGJobData>): Promise<void> => {
    const { documentId, userId, s3Key } = job.data
    const correlationId = documentId
    const requestId = uuidv4()

    logger.info('RAG pipeline started', { documentId, s3Key, jobId: job.id })

    const buffer = await s3Adapter.getBuffer(s3Key)

    auditService?.emit('DOCUMENT_PARSED', {
      correlationId,
      requestId,
      userId,
      payload: { documentId, s3Key },
    })

    await documentService.processDocument(documentId, buffer)

    auditService?.emit('DOCUMENT_CHUNKED', {
      correlationId,
      requestId,
      userId,
      payload: { documentId },
    })

    auditService?.emit('EMBEDDING_GENERATED', {
      correlationId,
      requestId,
      userId,
      payload: { documentId },
    })

    logger.info('RAG pipeline completed', { documentId, jobId: job.id })
  }
}
