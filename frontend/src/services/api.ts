import type {
  AnalyzeRequest,
  AnalyzeResult,
  HealthResponse,
} from '../types/api'

const API_BASE = '/api'

export async function getHealth(): Promise<HealthResponse> {
  const response = await fetch(`${API_BASE}/health`)
  if (!response.ok) {
    throw new Error('Failed to fetch API health status')
  }
  return response.json() as Promise<HealthResponse>
}

export async function runAnalysis(
  file: File,
  request: AnalyzeRequest,
): Promise<AnalyzeResult> {
  const formData = new FormData()
  formData.append('pcap', file)
  formData.append('config', JSON.stringify(request))

  const response = await fetch(`${API_BASE}/analyze`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const errorPayload = await response
      .json()
      .catch(() => ({ message: 'Analysis failed' }))
    throw new Error(errorPayload.message ?? 'Analysis failed')
  }

  return response.json() as Promise<AnalyzeResult>
}
