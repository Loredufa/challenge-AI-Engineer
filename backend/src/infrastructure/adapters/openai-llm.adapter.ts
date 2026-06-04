import OpenAI from 'openai'
import { ILLMProvider, LLMCompletionParams, LLMCompletionResult } from '@domain/ports/llm-provider.port'

export class OpenAILLMAdapter implements ILLMProvider {
  private client: OpenAI

  constructor(apiKey: string, private modelName = 'gpt-4o', baseURL?: string) {
    this.client = new OpenAI({ apiKey, ...(baseURL ? { baseURL } : {}) })
  }

  async complete(params: LLMCompletionParams): Promise<LLMCompletionResult> {
    const response = await this.client.chat.completions.create({
      model: this.modelName,
      messages: [
        { role: 'system', content: params.systemPrompt },
        { role: 'user', content: params.userMessage },
      ],
      max_tokens: params.maxTokens ?? 800,
      temperature: params.temperature ?? 0.2,
    })

    const choice = response.choices[0]
    return {
      content: choice.message.content ?? '',
      promptTokens: response.usage?.prompt_tokens ?? 0,
      completionTokens: response.usage?.completion_tokens ?? 0,
      model: response.model,
      finishReason: choice.finish_reason ?? 'stop',
    }
  }

  getProviderName(): string {
    return 'openai'
  }
}
