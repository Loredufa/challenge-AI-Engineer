import { useState } from 'react'
import api from '../lib/api'

type Rating = 'APPROVED' | 'REJECTED' | 'NEUTRAL'

interface Props {
  interactionId: string
}

const RATINGS: { value: Rating; label: string; emoji: string }[] = [
  { value: 'APPROVED', label: 'Helpful', emoji: '👍' },
  { value: 'NEUTRAL', label: 'Neutral', emoji: '😐' },
  { value: 'REJECTED', label: 'Not helpful', emoji: '👎' },
]

export function FeedbackWidget({ interactionId }: Props) {
  const [selected, setSelected] = useState<Rating | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleRate(rating: Rating) {
    if (submitted || loading) return
    setLoading(true)
    setError(null)
    try {
      await api.post('/feedback', { interaction_id: interactionId, rating })
      setSelected(rating)
      setSubmitted(true)
    } catch {
      setError('Could not send feedback. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-3 flex items-center gap-3">
      {RATINGS.map(({ value, label, emoji }) => (
        <button
          key={value}
          onClick={() => handleRate(value)}
          disabled={submitted || loading}
          className={[
            'flex items-center gap-1 px-3 py-1 rounded-full text-xs border transition-colors',
            selected === value
              ? 'bg-blue-100 border-blue-400 text-blue-700 font-semibold'
              : 'border-gray-200 text-gray-500 hover:bg-gray-50 hover:border-gray-300',
            (submitted || loading) ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
          ].join(' ')}
          aria-pressed={selected === value}
          title={label}
        >
          <span>{emoji}</span>
          <span>{label}</span>
        </button>
      ))}
      {submitted && (
        <span className="text-xs text-green-600 font-medium">Thanks for your feedback!</span>
      )}
      {error && (
        <span className="text-xs text-red-500">{error}</span>
      )}
    </div>
  )
}
