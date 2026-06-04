import { IPromptVersionRepository } from '@domain/repositories/prompt-version.repository'
import { AssembledContext } from '@domain/services/context-assembler.service'

export interface BuiltPrompt {
  systemPrompt: string
  userMessage: string
  promptVersionId: string
  promptVersionNumber: number
  totalContextTokens: number
}

export class PromptBuilderService {
  constructor(private readonly promptVersionRepo: IPromptVersionRepository) {}

  async build(question: string, context: AssembledContext): Promise<BuiltPrompt> {
    const activeVersion = await this.promptVersionRepo.findActive('rag-system')
    if (!activeVersion) {
      throw new Error('No active prompt version found for "rag-system"')
    }

    const userMessage = `Context:\n${context.contextText}\n\nQuestion: ${question}`

    return {
      systemPrompt: activeVersion.content,
      userMessage,
      promptVersionId: activeVersion.id,
      promptVersionNumber: activeVersion.versionNumber,
      totalContextTokens: context.tokenCount,
    }
  }
}
