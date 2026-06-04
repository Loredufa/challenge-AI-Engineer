import { Request, Response, NextFunction } from 'express'
import { createHash } from 'crypto'
import { z } from 'zod'
import { IPromptVersionRepository } from '@domain/repositories/prompt-version.repository'

export class PromptController {
  constructor(private readonly promptRepo: IPromptVersionRepository) {}

  /** GET /api/v1/prompts/:name — Lists all versions of a named prompt template, ordered by version number. */
  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { name } = req.params
      const versions = await this.promptRepo.findAll(name)
      res.json({ data: versions })
    } catch (err) {
      next(err)
    }
  }

  /** POST /api/v1/prompts — Creates a new inactive version of a prompt template. Version number is auto-incremented from the latest existing version. */
  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const schema = z.object({
        name: z.string().min(1).max(100),
        content: z.string().min(1),
      })
      const { name, content } = schema.parse(req.body)

      const existing = await this.promptRepo.findAll(name)
      const versionNumber = existing.length > 0
        ? Math.max(...existing.map((v) => v.versionNumber)) + 1
        : 1

      const contentHash = createHash('sha256').update(content).digest('hex')

      const version = await this.promptRepo.create({
        name,
        versionNumber,
        content,
        contentHash,
        isActive: false,
        deprecatedAt: null,
      })

      res.status(201).json(version)
    } catch (err) {
      next(err)
    }
  }

  /** PUT /api/v1/prompts/:id/activate — Activates a specific prompt version. Deactivates all other versions of the same name. This takes effect on the next LLM call without requiring a deployment. */
  activate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params
      await this.promptRepo.activate(id)
      res.json({ message: 'Prompt version activated' })
    } catch (err) {
      next(err)
    }
  }

  /** PATCH /api/v1/prompts/:id/deprecate — Marks a prompt version as deprecated with an optional reason. Deprecated versions are retained for audit purposes but cannot be activated. */
  deprecate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const schema = z.object({ reason: z.string().optional() })
      const { reason } = schema.parse(req.body)
      await this.promptRepo.deprecate(req.params.id, reason)
      res.json({ message: 'Prompt version deprecated' })
    } catch (err) {
      next(err)
    }
  }
}
