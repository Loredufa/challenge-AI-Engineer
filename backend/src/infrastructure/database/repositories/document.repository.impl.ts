import { Pool } from 'pg'
import { IDocumentRepository } from '@domain/repositories/document.repository'
import { Document, DocumentStatus } from '@domain/entities/document.entity'

function rowToDocument(row: Record<string, unknown>): Document {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    filename: row.filename as string,
    originalName: row.original_name as string,
    s3Key: row.s3_key as string,
    sizeBytes: Number(row.size_bytes),
    status: row.status as DocumentStatus,
    totalPages: row.total_pages != null ? Number(row.total_pages) : null,
    totalChunks: row.total_chunks != null ? Number(row.total_chunks) : null,
    errorMessage: row.error_message as string | null,
    createdAt: row.created_at as Date,
    updatedAt: row.updated_at as Date,
  }
}

export class DocumentRepositoryImpl implements IDocumentRepository {
  constructor(private readonly pool: Pool) {}

  async create(data: Omit<Document, 'id' | 'createdAt' | 'updatedAt'>): Promise<Document> {
    const { rows } = await this.pool.query(
      `INSERT INTO documents (user_id, filename, original_name, s3_key, size_bytes, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [data.userId, data.filename, data.originalName, data.s3Key, data.sizeBytes, data.status]
    )
    return rowToDocument(rows[0])
  }

  async findById(id: string): Promise<Document | null> {
    const { rows } = await this.pool.query(
      'SELECT * FROM documents WHERE id = $1 LIMIT 1',
      [id]
    )
    return rows[0] ? rowToDocument(rows[0]) : null
  }

  async findByUser(userId: string, status?: DocumentStatus): Promise<Document[]> {
    if (status) {
      const { rows } = await this.pool.query(
        'SELECT * FROM documents WHERE user_id = $1 AND status = $2 ORDER BY created_at DESC',
        [userId, status]
      )
      return rows.map(rowToDocument)
    }
    const { rows } = await this.pool.query(
      'SELECT * FROM documents WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    )
    return rows.map(rowToDocument)
  }

  async updateStatus(
    id: string,
    status: DocumentStatus,
    extra?: Partial<Document>
  ): Promise<void> {
    const updates: string[] = ['status = $2', 'updated_at = NOW()']
    const values: unknown[] = [id, status]
    let paramIdx = 3

    if (extra?.totalPages !== undefined) {
      updates.push(`total_pages = $${paramIdx++}`)
      values.push(extra.totalPages)
    }
    if (extra?.totalChunks !== undefined) {
      updates.push(`total_chunks = $${paramIdx++}`)
      values.push(extra.totalChunks)
    }
    if (extra?.errorMessage !== undefined) {
      updates.push(`error_message = $${paramIdx++}`)
      values.push(extra.errorMessage)
    }

    await this.pool.query(
      `UPDATE documents SET ${updates.join(', ')} WHERE id = $1`,
      values
    )
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const { rowCount } = await this.pool.query(
      'DELETE FROM documents WHERE id = $1 AND user_id = $2',
      [id, userId]
    )
    return (rowCount ?? 0) > 0
  }

  async findByUserPaginated(
    userId: string,
    page: number,
    limit: number
  ): Promise<{ data: Document[]; total: number }> {
    const offset = (page - 1) * limit
    const { rows: dataRows } = await this.pool.query(
      'SELECT * FROM documents WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [userId, limit, offset]
    )
    const { rows: countRows } = await this.pool.query(
      'SELECT COUNT(*)::int AS total FROM documents WHERE user_id = $1',
      [userId]
    )
    return {
      data: dataRows.map(rowToDocument),
      total: countRows[0].total as number,
    }
  }
}
