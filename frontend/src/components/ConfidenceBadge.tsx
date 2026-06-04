interface Props {
  score: number
}

export function ConfidenceBadge({ score }: Props) {
  if (score >= 0.75) {
    return <span className="badge-red">High Confidence</span>
  }
  if (score >= 0.5) {
    return <span className="badge-yellow">Medium Confidence</span>
  }
  return <span className="badge-green">Low Confidence</span>
}
