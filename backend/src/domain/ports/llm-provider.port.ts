export interface LLMCompletionParams {
  systemPrompt: string
  userMessage: string
  maxTokens?: number
  temperature?: number
}

export interface LLMCompletionResult {
  content: string
  promptTokens: number
  completionTokens: number
  model: string
  finishReason: string
}

export interface ILLMProvider {
  complete(params: LLMCompletionParams): Promise<LLMCompletionResult>
  getProviderName(): string
}
