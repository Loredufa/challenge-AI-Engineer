import { PromptBuilderService } from '../../src/domain/services/prompt-builder.service'
import { IPromptVersionRepository } from '../../src/domain/repositories/prompt-version.repository'
import { PromptVersion } from '../../src/domain/entities/prompt-version.entity'
import { AssembledContext } from '../../src/domain/services/context-assembler.service'

function makePromptVersion(overrides: Partial<PromptVersion> = {}): PromptVersion {
  return {
    id: 'pv-1',
    name: 'rag-system',
    versionNumber: 1,
    content: 'You are a helpful assistant that answers questions based on provided context only.',
    contentHash: 'abc123',
    isActive: true,
    createdAt: new Date(),
    deprecatedAt: null,
    ...overrides,
  }
}

function makeAssembledContext(overrides: Partial<AssembledContext> = {}): AssembledContext {
  return {
    contextText: '<context>[Document: contract.pdf | Page: 1]\nDelivery is 30 days.\n</context>',
    sources: [{
      documentId: 'doc-1',
      documentName: 'contract.pdf',
      chunkId: 'chunk-1',
      pageNumber: 1,
      excerpt: 'Delivery is 30 days.',
      similarityScore: 0.9,
    }],
    tokenCount: 25,
    ...overrides,
  }
}

describe('PromptBuilderService', () => {
  let promptVersionRepo: jest.Mocked<IPromptVersionRepository>
  let service: PromptBuilderService

  beforeEach(() => {
    promptVersionRepo = {
      findActive: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      activate: jest.fn(),
      deprecate: jest.fn(),
      findAll: jest.fn(),
    }

    service = new PromptBuilderService(promptVersionRepo)
  })

  describe('build()', () => {
    it('returns correct structure with active prompt version', async () => {
      const version = makePromptVersion()
      promptVersionRepo.findActive.mockResolvedValue(version)
      const context = makeAssembledContext()

      const result = await service.build('What is the delivery timeline?', context)

      expect(result.systemPrompt).toBe(version.content)
      expect(result.userMessage).toContain('Context:')
      expect(result.userMessage).toContain(context.contextText)
      expect(result.userMessage).toContain('Question: What is the delivery timeline?')
      expect(result.promptVersionId).toBe('pv-1')
      expect(result.promptVersionNumber).toBe(1)
      expect(result.totalContextTokens).toBe(25)
    })

    it('throws error when no active prompt version found', async () => {
      promptVersionRepo.findActive.mockResolvedValue(null)
      const context = makeAssembledContext()

      await expect(
        service.build('What is the deadline?', context)
      ).rejects.toThrow('No active prompt version found for "rag-system"')
    })

    it('calls findActive with "rag-system" name', async () => {
      promptVersionRepo.findActive.mockResolvedValue(makePromptVersion())
      const context = makeAssembledContext()

      await service.build('Some question', context)

      expect(promptVersionRepo.findActive).toHaveBeenCalledWith('rag-system')
    })
  })
})
