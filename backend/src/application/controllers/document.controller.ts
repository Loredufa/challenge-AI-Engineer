import { Request, Response, NextFunction } from 'express'
import { Queue } from 'bullmq'
import { v4 as uuidv4 } from 'uuid'
import { DocumentService } from '@domain/services/document.service'
import { S3Adapter } from '@infrastructure/adapters/s3.adapter'
import { RAGJobData } from '@infrastructure/queue/rag.queue'
import { AuditService } from '@domain/services/audit.service'
import { NotFoundError, ForbiddenError } from '@shared/errors'
import { fixEncoding } from '@shared/encoding'

export class DocumentController {
  constructor(
    private readonly documentService: DocumentService,
    private readonly s3Adapter: S3Adapter,
    private readonly ragQueue: Queue<RAGJobData>,
    private readonly auditService?: AuditService,
  ) {}

  /** POST /api/v1/documents/upload — Uploads a PDF to S3 and enqueues an async job for parsing, chunking, and embedding. Returns 202 immediately with the document ID and PENDING status. */
  upload = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = res.locals.userId as string
      const correlationId = res.locals.correlationId as string
      const requestId = res.locals.requestId as string
      const file = req.file

      if (!file) {
        res.status(400).json({ error: 'No file uploaded' })
        return
      }

      const s3Key = `docs/${userId}/${uuidv4()}.pdf`

      await this.s3Adapter.upload(s3Key, file.buffer, file.mimetype)

      const document = await this.documentService.createDocument({
        userId,
        filename: `${uuidv4()}.pdf`,
        originalName: fixEncoding(file.originalname),
        s3Key,
        sizeBytes: file.size,
        status: 'PENDING',
        totalPages: null,
        totalChunks: null,
        errorMessage: null,
      })

      await this.ragQueue.add('process-document', {
        documentId: document.id,
        userId,
        s3Key,
      })

      this.auditService?.emit('DOCUMENT_UPLOADED', {
        correlationId,
        requestId,
        userId,
        payload: {
          documentId: document.id,
          originalName: file.originalname,
          sizeBytes: file.size,
        },
      })

      res.status(202).json({
        documentId: document.id,
        status: document.status,
        originalName: document.originalName,
        sizeBytes: document.sizeBytes,
        createdAt: document.createdAt,
      })
    } catch (err) {
      next(err)
    }
  }

  /** GET /api/v1/documents — Returns a paginated list of documents belonging to the authenticated user. Supports ?page and ?limit query params. */
  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = res.locals.userId as string
      const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10))
      const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? '20'), 10)))

      const result = await this.documentService.getDocumentsByUser(userId, page, limit)

      res.status(200).json({
        data: result.data,
        pagination: {
          page,
          limit,
          total: result.total,
          totalPages: Math.ceil(result.total / limit),
        },
      })
    } catch (err) {
      next(err)
    }
  }

  /** DELETE /api/v1/documents/:id — Deletes a document and its chunks/embeddings. Returns 204 on success, 404 if not found or not owned by user. */
  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = res.locals.userId as string
      const { id } = req.params

      const deleted = await this.documentService.deleteDocument(id, userId)
      if (!deleted) {
        throw new NotFoundError('Document not found')
      }

      res.status(204).send()
    } catch (err) {
      next(err)
    }
  }

  /** GET /api/v1/documents/:id — Returns a single document by ID. Includes a presigned S3 URL when status is READY. Returns 403 if the document belongs to another user. */
  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = res.locals.userId as string
      const { id } = req.params

      const document = await this.documentService.getDocumentById(id)

      if (!document) {
        throw new NotFoundError('Document not found')
      }

      if (document.userId !== userId) {
        throw new ForbiddenError('Access denied')
      }

      const response: Record<string, unknown> = { ...document }

      if (document.status === 'READY') {
        response.presignedUrl = await this.s3Adapter.getPresignedUrl(document.s3Key)
      }

      res.status(200).json(response)
    } catch (err) {
      next(err)
    }
  }
}
