import { Pool } from 'pg'
import { IPromptVersionRepository } from '@domain/repositories/prompt-version.repository'
import { PromptVersion } from '@domain/entities/prompt-version.entity'

function rowToPromptVersion(row: Record<string, unknown>): PromptVersion {
  return {
    id: row.id as string,
    name: row.name as string,
    versionNumber: row.version_number as number,
    content: row.content as string,
    contentHash: row.content_hash as string,
    isActive: row.is_active as boolean,
    createdAt: row.created_at as Date,
    deprecatedAt: row.deprecated_at as Date | null,
  }
}

export class PromptVersionRepositoryImpl implements IPromptVersionRepository {
  constructor(private readonly pool: Pool) {}

  async findActive(name: string): Promise<PromptVersion | null> {
    const { rows } = await this.pool.query(
      'SELECT * FROM prompt_versions WHERE name = $1 AND is_active = TRUE LIMIT 1',
      [name]
    )
    return rows[0] ? rowToPromptVersion(rows[0]) : null
  }

  async findById(id: string): Promise<PromptVersion | null> {
    const { rows } = await this.pool.query(
      'SELECT * FROM prompt_versions WHERE id = $1 LIMIT 1',
      [id]
    )
    return rows[0] ? rowToPromptVersion(rows[0]) : null
  }

  async create(data: Omit<PromptVersion, 'id' | 'createdAt'>): Promise<PromptVersion> {
    const { rows } = await this.pool.query(
      `INSERT INTO prompt_versions (name, version_number, content, content_hash, is_active, deprecated_at, deprecation_reason)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        data.name,
        data.versionNumber,
        data.content,
        data.contentHash,
        data.isActive,
        data.deprecatedAt ?? null,
        null,
      ]
    )
    return rowToPromptVersion(rows[0])
  }

  async activate(id: string): Promise<void> {
    const client = await this.pool.connect()
    try {
      await client.query('BEGIN')
      // Deactivate all versions with the same name
      await client.query(
        `UPDATE prompt_versions
         SET is_active = FALSE
         WHERE name = (SELECT name FROM prompt_versions WHERE id = $1)`,
        [id]
      )
      // Activate the requested one
      await client.query(
        'UPDATE prompt_versions SET is_active = TRUE WHERE id = $1',
        [id]
      )
      await client.query('COMMIT')
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  }

  async deprecate(id: string, reason?: string): Promise<void> {
    await this.pool.query(
      `UPDATE prompt_versions
       SET is_active = FALSE, deprecated_at = NOW(), deprecation_reason = $2
       WHERE id = $1`,
      [id, reason ?? null]
    )
  }

  async findAll(name: string): Promise<PromptVersion[]> {
    const { rows } = await this.pool.query(
      'SELECT * FROM prompt_versions WHERE name = $1 ORDER BY version_number ASC',
      [name]
    )
    return rows.map(rowToPromptVersion)
  }
}
