import { ILLMProvider, LLMCompletionResult } from '@domain/ports/llm-provider.port'
import { IEmbeddingProvider } from '@domain/ports/embedding-provider.port'
import { IEmbeddingRepository } from '@domain/repositories/embedding.repository'
import { IAIInteractionRepository } from '@domain/repositories/ai-interaction.repository'
import { InputGuardService } from '@domain/services/input-guard.service'
import { OutputGuardService } from '@domain/services/output-guard.service'
import { ContextAssemblerService } from '@domain/services/context-assembler.service'
import { PromptBuilderService } from '@domain/services/prompt-builder.service'
import { AuditService } from '@domain/services/audit.service'

export interface ChatQuestion {
  question: string
  userId: string
  documentIds?: string[]
  correlationId: string
  requestId: string
}

export interface ChatAnswer {
  interactionId: string
  answer: string | null
  sources: Array<{
    documentId: string
    documentName: string
    chunkId: string
    pageNumber: number | null
    excerpt: string
    similarityScore: number
  }>
  confidenceScore: number
  warnings: string[]
  modelUsed: string | null
  promptVersion: number | null
  latencyMs: number
  rejectionReason: string | null
}

export class RAGService {
  constructor(
    private readonly inputGuard: InputGuardService,
    private readonly outputGuard: OutputGuardService,
    private readonly embeddingProvider: IEmbeddingProvider,
    private readonly embeddingRepo: IEmbeddingRepository,
    private readonly contextAssembler: ContextAssemblerService,
    private readonly promptBuilder: PromptBuilderService,
    private readonly llmProvider: ILLMProvider,
    private readonly interactionRepo: IAIInteractionRepository,
    private readonly auditService?: AuditService,
  ) {}

  async ask(params: ChatQuestion): Promise<ChatAnswer> {
    const startTime = Date.now()
    const auditCtx = {
      correlationId: params.correlationId,
      requestId: params.requestId,
      userId: params.userId,
    }

    // 1. Input Guard
    const guardResult = this.inputGuard.evaluate(params.question)

    this.auditService?.emit('QUESTION_RECEIVED', {
      ...auditCtx,
      payload: { question: params.question, documentIds: params.documentIds },
    })

    if (!guardResult.allowed) {
      const interaction = await this.interactionRepo.create({
        userId: params.userId,
        correlationId: params.correlationId,
        requestId: params.requestId,
        question: params.question,
        inputGuardResult: 'REJECTED',
        outputGuardResult: null,
        rejectionReason: guardResult.rejectionReason ?? null,
        status: 'REJECTED',
        promptVersionId: null,
        model: null,
        promptTokens: null,
        completionTokens: null,
        costUsd: null,
        latencyMs: Date.now() - startTime,
        response: null,
        confidenceScore: null,
        topSimilarityScore: null,
        retrievedChunkIds: [],
      })

      return {
        interactionId: interaction.id,
        answer: null,
        sources: [],
        confidenceScore: 0,
        warnings: [],
        modelUsed: null,
        promptVersion: null,
        latencyMs: Date.now() - startTime,
        rejectionReason: guardResult.rejectionReason ?? null,
      }
    }

    // 2. Embed question
    const queryEmbedding = await this.embeddingProvider.embed(params.question)

    // 3. Similarity search
    const similarChunks = await this.embeddingRepo.similaritySearch({
      queryEmbedding,
      userId: params.userId,
      documentIds: params.documentIds,
      topK: 5,
      threshold: 0.3,
    })

    this.auditService?.emit('RAG_SEARCH_EXECUTED', {
      ...auditCtx,
      payload: { chunksFound: similarChunks.length },
    })

    const topSimilarityScore = similarChunks.length > 0
      ? Math.max(...similarChunks.map((c) => c.similarity))
      : 0

    // 4. Assemble context
    const context = this.contextAssembler.assemble(similarChunks)

    // 5. Build prompt
    const builtPrompt = await this.promptBuilder.build(params.question, context)

    this.auditService?.emit('PROMPT_CREATED', {
      ...auditCtx,
      payload: {
        promptVersionId: builtPrompt.promptVersionId,
        promptVersionNumber: builtPrompt.promptVersionNumber,
        totalContextTokens: builtPrompt.totalContextTokens,
      },
    })

    // 6. LLM call
    const llmResult = await this.llmProvider.complete({
      systemPrompt: builtPrompt.systemPrompt,
      userMessage: builtPrompt.userMessage,
      maxTokens: 800,
      temperature: 0.2,
    })

    this.auditService?.emit('MODEL_INVOKED', {
      ...auditCtx,
      payload: {
        model: llmResult.model,
        promptTokens: llmResult.promptTokens,
        completionTokens: llmResult.completionTokens,
      },
    })

    // 7. Output Guard
    const outputResult = this.outputGuard.evaluate(llmResult.content, topSimilarityScore)

    this.auditService?.emit('OUTPUT_VALIDATED', {
      ...auditCtx,
      payload: {
        allowed: outputResult.allowed,
        confidenceScore: outputResult.confidenceScore,
        warnings: outputResult.warnings,
      },
    })

    if (!outputResult.allowed) {
      const interaction = await this.interactionRepo.create({
        userId: params.userId,
        correlationId: params.correlationId,
        requestId: params.requestId,
        question: params.question,
        inputGuardResult: 'ALLOWED',
        outputGuardResult: 'REJECTED',
        rejectionReason: outputResult.rejectionReason ?? null,
        status: 'REJECTED',
        promptVersionId: builtPrompt.promptVersionId,
        model: llmResult.model,
        promptTokens: llmResult.promptTokens,
        completionTokens: llmResult.completionTokens,
        costUsd: this.calculateCost(llmResult),
        latencyMs: Date.now() - startTime,
        response: null,
        confidenceScore: 0,
        topSimilarityScore,
        retrievedChunkIds: similarChunks.map((c) => c.chunk.id),
      })

      return {
        interactionId: interaction.id,
        answer: null,
        sources: [],
        confidenceScore: 0,
        warnings: [],
        modelUsed: llmResult.model,
        promptVersion: builtPrompt.promptVersionNumber,
        latencyMs: Date.now() - startTime,
        rejectionReason: outputResult.rejectionReason ?? null,
      }
    }

    // 8. Persist completed interaction
    const finalResponse = outputResult.modifiedResponse ?? llmResult.content
    const interaction = await this.interactionRepo.create({
      userId: params.userId,
      correlationId: params.correlationId,
      requestId: params.requestId,
      question: params.question,
      inputGuardResult: 'ALLOWED',
      outputGuardResult: 'ALLOWED',
      rejectionReason: null,
      status: 'COMPLETED',
      promptVersionId: builtPrompt.promptVersionId,
      model: llmResult.model,
      promptTokens: llmResult.promptTokens,
      completionTokens: llmResult.completionTokens,
      costUsd: this.calculateCost(llmResult),
      latencyMs: Date.now() - startTime,
      response: finalResponse,
      confidenceScore: outputResult.confidenceScore,
      topSimilarityScore,
      retrievedChunkIds: similarChunks.map((c) => c.chunk.id),
    })

    this.auditService?.emit('RESPONSE_RETURNED', {
      ...auditCtx,
      payload: {
        interactionId: interaction.id,
        confidenceScore: outputResult.confidenceScore,
        latencyMs: Date.now() - startTime,
      },
    })

    return {
      interactionId: interaction.id,
      answer: finalResponse,
      sources: context.sources,
      confidenceScore: outputResult.confidenceScore,
      warnings: outputResult.warnings,
      modelUsed: llmResult.model,
      promptVersion: builtPrompt.promptVersionNumber,
      latencyMs: Date.now() - startTime,
      rejectionReason: null,
    }
  }

  async getHistory(userId: string, limit = 30) {
    const rows = await this.interactionRepo.findByUser(userId, limit)
    return rows
      .filter((r) => r.status !== 'FAILED')
      .reverse()
      .map((r) => ({
        interaction_id: r.id,
        question: r.question,
        answer: r.response,
        confidence_score: r.confidenceScore ?? 0,
        warnings: (r.confidenceScore ?? 1) < 0.5 ? ['possible_hallucination'] : [],
        model_used: r.model,
        latency_ms: r.latencyMs,
        rejection_reason: r.rejectionReason,
        created_at: r.createdAt,
      }))
  }

  private calculateCost(result: LLMCompletionResult): number {
    // gpt-4o: $2.50/1M input, $10.00/1M output
    // mock: $0
    if (result.model.includes('mock')) return 0
    return (result.promptTokens / 1_000_000) * 2.50 +
           (result.completionTokens / 1_000_000) * 10.00
  }
}
