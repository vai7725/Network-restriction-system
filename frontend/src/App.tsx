import { useEffect, useState } from 'react'
import AnalyzerForm from './components/AnalyzerForm'
import RunSummary from './components/RunSummary'
import { getHealth } from './services/api'
import type { AnalyzeResult, HealthResponse } from './types/api'

export default function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [healthError, setHealthError] = useState<string | null>(null)
  const [latestResult, setLatestResult] = useState<AnalyzeResult | null>(null)

  useEffect(() => {
    getHealth()
      .then((response) => setHealth(response))
      .catch((error: unknown) => {
        const message =
          error instanceof Error ? error.message : 'API health check failed'
        setHealthError(message)
      })
  }, [])

  return (
    <main className="container">
      <header>
        <h1>Packet Analyzer Dashboard</h1>
        {health ? (
          <p>
            API: {health.status} | nrs_engine:{' '}
            {health.analyzers.multi ? 'available' : 'missing'} | nrs_simple:{' '}
            {health.analyzers.simple ? 'available' : 'missing'}
          </p>
        ) : (
          <p>{healthError ?? 'Checking API health...'}</p>
        )}
      </header>

      <AnalyzerForm onResult={setLatestResult} />

      {latestResult ? <RunSummary result={latestResult} /> : null}
    </main>
  )
}
