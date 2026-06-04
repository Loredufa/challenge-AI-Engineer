import Anthropic from '@anthropic-ai/sdk'
import { ILLMProvider, LLMCompletionParams, LLMCompletionResult } from '@domain/ports/llm-provider.port'

export class AnthropicLLMAdapter implements ILLMProvider {
  private client: Anthropic

  constructor(apiKey: string, private modelName = 'claude-sonnet-4-6') {
    this.client = new Anthropic({ apiKey })
  }

  async complete(params: LLMCompletionParams): Promise<LLMCompletionResult> {
    const response = await this.client.messages.create({
      model: this.modelName,
      system: params.systemPrompt,
      messages: [{ role: 'user', content: params.userMessage }],
      max_tokens: params.maxTokens ?? 800,
      temperature: params.temperature ?? 0.2,
    })

    const block = response.content[0]
    return {
      content: block.type === 'text' ? block.text : '',
      promptTokens: response.usage.input_tokens,
      completionTokens: response.usage.output_tokens,
      model: response.model,
      finishReason: response.stop_reason ?? 'end_turn',
    }
  }

  getProviderName(): string {
    return 'anthropic'
  }
}
