import { PromptVersion } from '@domain/entities/prompt-version.entity'

export interface IPromptVersionRepository {
  findActive(name: string): Promise<PromptVersion | null>
  findById(id: string): Promise<PromptVersion | null>
  create(data: Omit<PromptVersion, 'id' | 'createdAt'>): Promise<PromptVersion>
  activate(id: string): Promise<void>
  deprecate(id: string, reason?: string): Promise<void>
  findAll(name: string): Promise<PromptVersion[]>
}
