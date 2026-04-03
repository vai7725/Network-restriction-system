export type EngineMode = 'multi' | 'simple'

export interface AnalyzeRequest {
  engine: EngineMode
  blockIps: string[]
  blockApps: string[]
  blockDomains: string[]
  lbs?: number
  fps?: number
}

export interface AnalyzeStats {
  totalPackets?: number
  totalBytes?: number
  forwarded?: number
  dropped?: number
  dropRatePercent?: number
  tcpPackets?: number
  udpPackets?: number
  blockedEvents?: number
}

export interface AnalyzeResult {
  runId: string
  inputFile: string
  outputFile: string
  outputDownloadPath: string
  engine: EngineMode
  command: string
  durationMs: number
  stats: AnalyzeStats
  stdout: string
  stderr: string
  completedAt: string
}

export interface HealthResponse {
  status: 'ok'
  analyzers: {
    multi: boolean
    simple: boolean
  }
}
