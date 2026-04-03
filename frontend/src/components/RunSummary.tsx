import type { AnalyzeResult } from '../types/api'

interface RunSummaryProps {
  result: AnalyzeResult
}

function formatNumber(value: number | undefined): string {
  if (typeof value !== 'number') {
    return '-'
  }
  return value.toLocaleString()
}

export default function RunSummary({ result }: RunSummaryProps) {
  return (
    <section className="card">
      <h2>Latest Run</h2>
      <div className="stats-grid">
        <div>
          <p className="label">Engine</p>
          <p>{result.engine}</p>
        </div>
        <div>
          <p className="label">Duration</p>
          <p>{result.durationMs} ms</p>
        </div>
        <div>
          <p className="label">Total Packets</p>
          <p>{formatNumber(result.stats.totalPackets)}</p>
        </div>
        <div>
          <p className="label">Forwarded</p>
          <p>{formatNumber(result.stats.forwarded)}</p>
        </div>
        <div>
          <p className="label">Dropped</p>
          <p>{formatNumber(result.stats.dropped)}</p>
        </div>
        <div>
          <p className="label">Drop Rate</p>
          <p>
            {typeof result.stats.dropRatePercent === 'number'
              ? `${result.stats.dropRatePercent.toFixed(2)}%`
              : '-'}
          </p>
        </div>
      </div>

      <p className="label">Command</p>
      <pre className="code-block">{result.command}</pre>

      <a className="download-link" href={result.outputDownloadPath}>
        Download output PCAP
      </a>

      {result.stderr.trim() ? (
        <>
          <p className="label">stderr</p>
          <pre className="code-block">{result.stderr}</pre>
        </>
      ) : null}
    </section>
  )
}
