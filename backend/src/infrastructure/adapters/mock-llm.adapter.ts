import { ILLMProvider, LLMCompletionParams, LLMCompletionResult } from '@domain/ports/llm-provider.port'

export class MockLLMAdapter implements ILLMProvider {
  async complete(params: LLMCompletionParams): Promise<LLMCompletionResult> {
    return {
      content: `Based on the provided context, here is the answer to: "${params.userMessage.substring(0, 50)}..."`,
      promptTokens: Math.ceil(params.systemPrompt.length / 4) + Math.ceil(params.userMessage.length / 4),
      completionTokens: 50,
      model: 'mock-gpt',
      finishReason: 'stop',
    }
  }

  getProviderName(): string {
    return 'mock'
  }
}
