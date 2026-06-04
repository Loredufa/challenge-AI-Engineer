import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import api from '../lib/api'
import { authStore } from '../lib/auth'
import type { ChatResponse, HistoryEntry } from '../lib/types'
import { Layout } from '../components/Layout'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { ErrorBanner } from '../components/ErrorBanner'
import { ConfidenceBadge } from '../components/ConfidenceBadge'
import { SourcesAccordion } from '../components/SourcesAccordion'
import { FeedbackWidget } from '../components/FeedbackWidget'

interface ConversationEntry {
  id: string
  question: string
  response: ChatResponse | null
  networkError: boolean
}

const REJECTION_MESSAGES: Record<string, string> = {
  PROMPT_INJECTION: 'Detected attempt to manipulate the AI.',
  JAILBREAK: 'Detected jailbreak attempt.',
  PROMPT_EXTRACTION: 'Cannot reveal system instructions.',
}

function isHallucinationWarning(response: ChatResponse): boolean {
  return (
    response.confidence_score < 0.5 ||
    response.warnings.includes('possible_hallucination')
  )
}

function AIResponseCard({ entry }: { entry: ConversationEntry }) {
  const { response, networkError } = entry

  if (networkError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4">
        <ErrorBanner message="Something went wrong. Please try again." />
      </div>
    )
  }

  if (!response) return null

  // Rejected question
  if (response.answer === null && response.rejection_reason) {
    const detail =
      REJECTION_MESSAGES[response.rejection_reason] ?? 'Please rephrase your question.'
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-2">
        <p className="font-medium text-red-700 text-sm">
          Your question was blocked by the security policy.
        </p>
        <p className="text-xs text-red-600">{detail}</p>
      </div>
    )
  }

  const hallucination = isHallucinationWarning(response)

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
      {/* Header row */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">AI</span>
        <ConfidenceBadge score={response.confidence_score} />
      </div>

      {/* Hallucination warning banner */}
      {hallucination && (
        <div className="flex items-center gap-1.5 rounded bg-yellow-50 border border-yellow-200 px-2 py-1 text-xs text-yellow-700">
          <span>&#x26A0;&#xFE0F;</span>
          <span>This answer may not be fully accurate. Verify against the source documents.</span>
        </div>
      )}

      {/* Answer text */}
      <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">
        {response.answer ?? response.message ?? 'No answer returned.'}
      </p>

      {/* Sources */}
      <SourcesAccordion sources={response.sources ?? []} />

      {/* Feedback */}
      <FeedbackWidget interactionId={response.interaction_id} />

      {/* Footer info */}
      <p className="text-xs text-gray-400">
        {[
          response.model_used,
          response.prompt_version !== null ? `Prompt v${response.prompt_version}` : null,
          response.latency_ms ? `${(response.latency_ms / 1000).toFixed(1)}s` : null,
        ]
          .filter(Boolean)
          .join(' · ')}
      </p>
    </div>
  )
}

export default function ChatPage() {
  const router = useRouter()
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const [conversation, setConversation] = useState<ConversationEntry[]>([])
  const [question, setQuestion] = useState('')
  const [thinking, setThinking] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(true)

  // Last submitted question for re-ask
  const [lastQuestion, setLastQuestion] = useState('')

  useEffect(() => {
    if (!authStore.isAuthenticated()) {
      router.replace('/login')
      return
    }
    api.get<{ history: HistoryEntry[] }>('/chat/history')
      .then(({ data }) => {
        const entries: ConversationEntry[] = data.history.map((h) => ({
          id: h.interaction_id,
          question: h.question,
          response: {
            interaction_id: h.interaction_id,
            answer: h.answer,
            sources: [],
            confidence_score: h.confidence_score,
            warnings: h.warnings,
            model_used: h.model_used,
            prompt_version: null,
            latency_ms: h.latency_ms ?? 0,
            rejection_reason: h.rejection_reason,
          },
          networkError: false,
        }))
        setConversation(entries)
      })
      .catch(() => { /* historial no crítico, falla silenciosa */ })
      .finally(() => setLoadingHistory(false))
  }, [router])

  // Scroll to bottom when conversation updates
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversation, thinking])

  async function submitQuestion(q: string) {
    if (!q.trim() || thinking) return
    const trimmed = q.trim()
    setLastQuestion(trimmed)
    setThinking(true)

    const entryId = `${Date.now()}-${Math.random()}`

    try {
      const { data } = await api.post<ChatResponse>('/chat/question', {
        question: trimmed,
      })
      setConversation((prev) => [
        ...prev,
        { id: entryId, question: trimmed, response: data, networkError: false },
      ])
    } catch {
      setConversation((prev) => [
        ...prev,
        { id: entryId, question: trimmed, response: null, networkError: true },
      ])
    } finally {
      setThinking(false)
      setQuestion('')
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    submitQuestion(question)
  }

  function handleReask() {
    setQuestion(lastQuestion)
    textareaRef.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submitQuestion(question)
    }
  }

  const canSubmit = question.trim().length > 0 && !thinking

  return (
    <Layout>
      <div className="flex flex-col h-[calc(100vh-8rem)]">
        {/* Conversation area */}
        <div className="flex-1 overflow-y-auto space-y-6 pb-4">
          {loadingHistory && (
            <div className="flex items-center justify-center h-full">
              <LoadingSpinner size="sm" />
            </div>
          )}

          {!loadingHistory && conversation.length === 0 && !thinking && (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-400 text-sm text-center max-w-sm">
                Ask a question about your documents.<br />
                Answers are grounded in the content you uploaded.
              </p>
            </div>
          )}

          {conversation.map((entry) => (
            <div key={entry.id} className="space-y-3">
              {/* User bubble */}
              <div className="flex justify-end">
                <div className="bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-2 max-w-[75%] text-sm">
                  {entry.question}
                </div>
              </div>
              {/* AI card */}
              <AIResponseCard entry={entry} />
            </div>
          ))}

          {/* Thinking state */}
          {thinking && (
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <LoadingSpinner size="sm" />
              <span>Thinking...</span>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        <div className="pt-4 border-t border-gray-200">
          <form onSubmit={handleSubmit} className="flex gap-2 items-end">
            <textarea
              ref={textareaRef}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question about your documents..."
              rows={2}
              disabled={thinking}
              className="flex-1 input-base resize-none"
            />
            <div className="flex flex-col gap-2">
              <button
                type="submit"
                disabled={!canSubmit}
                className="btn-primary"
              >
                {thinking ? <LoadingSpinner size="sm" /> : 'Ask'}
              </button>
              {lastQuestion && (
                <button
                  type="button"
                  onClick={handleReask}
                  disabled={thinking}
                  className="btn-secondary text-xs"
                  title="Re-ask previous question"
                >
                  Re-ask
                </button>
              )}
            </div>
          </form>
          <p className="text-xs text-gray-400 mt-1">
            Press Enter to send, Shift+Enter for new line.
          </p>
        </div>
      </div>
    </Layout>
  )
}
