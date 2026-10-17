const severityWeights = {
  low: 5,
  medium: 15,
  high: 30,
}

function calculateRiskScore(events) {
  const total = events.reduce((score, event) => {
    return score + (severityWeights[event.severity.toLowerCase()] ?? 0)
  }, 0)

  return Math.min(total, 100)
}

export default calculateRiskScore
