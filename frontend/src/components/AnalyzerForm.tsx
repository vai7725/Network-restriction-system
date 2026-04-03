import { FormEvent, useMemo, useState } from 'react'
import type { AnalyzeRequest, AnalyzeResult, EngineMode } from '../types/api'
import { runAnalysis } from '../services/api'

interface AnalyzerFormProps {
  onResult: (result: AnalyzeResult) => void
}

const APP_OPTIONS = [
  'Google',
  'YouTube',
  'Facebook',
  'Instagram',
  'Twitter',
  'Netflix',
  'Amazon',
  'Microsoft',
  'Apple',
  'WhatsApp',
  'Telegram',
  'TikTok',
  'Spotify',
  'Zoom',
  'Discord',
  'GitHub',
]

function splitCsv(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

export default function AnalyzerForm({ onResult }: AnalyzerFormProps) {
  const [file, setFile] = useState<File | null>(null)
  const [engine, setEngine] = useState<EngineMode>('multi')
  const [blockIpsInput, setBlockIpsInput] = useState('')
  const [blockDomainsInput, setBlockDomainsInput] = useState('')
  const [selectedApps, setSelectedApps] = useState<string[]>([])
  const [lbs, setLbs] = useState<number>(2)
  const [fps, setFps] = useState<number>(2)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const requestPreview = useMemo<AnalyzeRequest>(
    () => ({
      engine,
      blockIps: splitCsv(blockIpsInput),
      blockApps: selectedApps,
      blockDomains: splitCsv(blockDomainsInput),
      lbs,
      fps,
    }),
    [engine, blockIpsInput, selectedApps, blockDomainsInput, lbs, fps],
  )

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    if (!file) {
      setError('Please select a .pcap file first.')
      return
    }

    setIsSubmitting(true)
    try {
      const result = await runAnalysis(file, requestPreview)
      onResult(result)
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : 'Failed to run analysis'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  function toggleApp(app: string) {
    setSelectedApps((current) =>
      current.includes(app)
        ? current.filter((item) => item !== app)
        : [...current, app],
    )
  }

  return (
    <section className="card">
      <h2>Run Packet Analysis</h2>
      <form onSubmit={handleSubmit} className="form-grid">
        <label>
          PCAP File
          <input
            type="file"
            accept=".pcap"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </label>

        <label>
          Engine
          <select
            value={engine}
            onChange={(event) => setEngine(event.target.value as EngineMode)}
          >
            <option value="multi">nrs_engine (multi-threaded)</option>
            <option value="simple">nrs_simple (single-threaded)</option>
          </select>
        </label>

        <label>
          Block IPs (comma-separated)
          <input
            type="text"
            placeholder="192.168.1.10, 10.0.0.5"
            value={blockIpsInput}
            onChange={(event) => setBlockIpsInput(event.target.value)}
          />
        </label>

        <label>
          Block Domains (comma-separated)
          <input
            type="text"
            placeholder="youtube.com, *.facebook.com"
            value={blockDomainsInput}
            onChange={(event) => setBlockDomainsInput(event.target.value)}
          />
        </label>

        {engine === 'multi' ? (
          <>
            <label>
              Load Balancers
              <input
                type="number"
                min={1}
                value={lbs}
                onChange={(event) => setLbs(Number(event.target.value))}
              />
            </label>

            <label>
              FPs per LB
              <input
                type="number"
                min={1}
                value={fps}
                onChange={(event) => setFps(Number(event.target.value))}
              />
            </label>
          </>
        ) : null}

        <fieldset>
          <legend>Block Apps</legend>
          <div className="chips">
            {APP_OPTIONS.map((app) => {
              const selected = selectedApps.includes(app)
              return (
                <button
                  key={app}
                  type="button"
                  className={selected ? 'chip selected' : 'chip'}
                  onClick={() => toggleApp(app)}
                >
                  {app}
                </button>
              )
            })}
          </div>
        </fieldset>

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Running...' : 'Run Analysis'}
        </button>
      </form>

      {error ? <p className="error">{error}</p> : null}
    </section>
  )
}
