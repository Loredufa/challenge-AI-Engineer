import { IDocumentRepository } from '@domain/repositories/document.repository'
import { IChunkRepository } from '@domain/repositories/chunk.repository'
import { IEmbeddingRepository } from '@domain/repositories/embedding.repository'
import { IEmbeddingProvider } from '@domain/ports/embedding-provider.port'
import { PDFParserService } from '@domain/services/pdf-parser.service'
import { DocumentSanitizerService } from '@domain/services/document-sanitizer.service'
import { ChunkerService } from '@domain/services/chunker.service'
import { S3Adapter } from '@infrastructure/adapters/s3.adapter'
import { Document } from '@domain/entities/document.entity'
import { DocumentChunk } from '@domain/entities/document-chunk.entity'

export class DocumentService {
  constructor(
    private readonly documentRepo: IDocumentRepository,
    private readonly chunkRepo: IChunkRepository,
    private readonly embeddingRepo: IEmbeddingRepository,
    private readonly embeddingProvider: IEmbeddingProvider,
    private readonly pdfParser: PDFParserService,
    private readonly sanitizer: DocumentSanitizerService,
    private readonly chunker: ChunkerService,
    private readonly s3Adapter?: S3Adapter
  ) {}

  async processDocument(documentId: string, buffer: Buffer): Promise<void> {
    await this.documentRepo.updateStatus(documentId, 'PROCESSING')

    try {
      const parsed = await this.pdfParser.parse(buffer)

      const sanitizeResult = this.sanitizer.sanitize(parsed.text)
      if (!sanitizeResult.safe) {
        await this.documentRepo.updateStatus(documentId, 'QUARANTINED', {
          errorMessage: sanitizeResult.reason,
        })
        return
      }

      const document = await this.documentRepo.findById(documentId)
      if (!document) throw new Error(`Document ${documentId} not found`)

      const allChunks: Omit<DocumentChunk, 'id' | 'createdAt'>[] = []

      if (parsed.pageTexts.length > 0) {
        for (const { page, text } of parsed.pageTexts) {
          if (!text.trim()) continue
          const chunks = this.chunker.chunk(text, page)
          for (const c of chunks) {
            allChunks.push({
              documentId,
              userId: document.userId,
              chunkIndex: allChunks.length,
              content: c.content,
              pageNumber: c.pageNumber ?? null,
              tokenCount: c.tokenCount,
            })
          }
        }
      } else {
        const chunks = this.chunker.chunk(parsed.text)
        for (const c of chunks) {
          allChunks.push({
            documentId,
            userId: document.userId,
            chunkIndex: allChunks.length,
            content: c.content,
            pageNumber: null,
            tokenCount: c.tokenCount,
          })
        }
      }

      const savedChunks = await this.chunkRepo.bulkCreate(allChunks)

      const texts = savedChunks.map((c) => c.content)
      const embeddings = await this.embeddingProvider.embedBatch(texts)

      await this.embeddingRepo.bulkCreate(
        savedChunks.map((chunk, i) => ({
          chunkId: chunk.id,
          userId: document.userId,
          model: this.embeddingProvider.getModelName(),
          embedding: embeddings[i],
        }))
      )

      await this.documentRepo.updateStatus(documentId, 'READY', {
        totalPages: parsed.totalPages,
        totalChunks: savedChunks.length,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      await this.documentRepo.updateStatus(documentId, 'FAILED', {
        errorMessage: message,
      })
      throw err
    }
  }

  async getDocumentsByUser(
    userId: string,
    page: number,
    limit: number
  ): Promise<{ data: Document[]; total: number }> {
    return this.documentRepo.findByUserPaginated(userId, page, limit)
  }

  async getDocumentById(id: string): Promise<Document | null> {
    return this.documentRepo.findById(id)
  }

  async createDocument(
    data: Omit<Document, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Document> {
    return this.documentRepo.create(data)
  }

  async deleteDocument(id: string, userId: string): Promise<boolean> {
    const document = await this.documentRepo.findById(id)
    if (!document || document.userId !== userId) return false

    const deleted = await this.documentRepo.delete(id, userId)
    if (deleted && this.s3Adapter) {
      try {
        await this.s3Adapter.delete(document.s3Key)
      } catch {
        // S3 delete is best-effort; DB record is already gone
      }
    }
    return deleted
  }
}
