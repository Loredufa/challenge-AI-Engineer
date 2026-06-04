import { DocumentChunk } from '@domain/entities/document-chunk.entity'

export interface IChunkRepository {
  bulkCreate(chunks: Omit<DocumentChunk, 'id' | 'createdAt'>[]): Promise<DocumentChunk[]>
  findByDocument(documentId: string): Promise<DocumentChunk[]>
  findById(id: string): Promise<DocumentChunk | null>
}
