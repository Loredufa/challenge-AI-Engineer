import { Document, DocumentStatus } from '@domain/entities/document.entity'

export interface IDocumentRepository {
  create(data: Omit<Document, 'id' | 'createdAt' | 'updatedAt'>): Promise<Document>
  findById(id: string): Promise<Document | null>
  findByUser(userId: string, status?: DocumentStatus): Promise<Document[]>
  updateStatus(id: string, status: DocumentStatus, extra?: Partial<Document>): Promise<void>
  findByUserPaginated(userId: string, page: number, limit: number): Promise<{ data: Document[]; total: number }>
  delete(id: string, userId: string): Promise<boolean>
}
