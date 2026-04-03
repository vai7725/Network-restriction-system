const express = require('express')
const cors = require('cors')
const multer = require('multer')
const { spawn } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')

const PORT = process.env.PORT ? Number(process.env.PORT) : 8787
const SERVER_ROOT = __dirname
const PROJECT_ROOT = path.resolve(SERVER_ROOT, '..', '..')
const UPLOADS_DIR = path.join(SERVER_ROOT, 'uploads')
const OUTPUTS_DIR = path.join(SERVER_ROOT, 'outputs')

const ANALYZERS = {
  multi: path.join(PROJECT_ROOT, 'nrs_engine'),
  simple: path.join(PROJECT_ROOT, 'nrs_simple'),
}

fs.mkdirSync(UPLOADS_DIR, { recursive: true })
fs.mkdirSync(OUTPUTS_DIR, { recursive: true })

const app = express()
app.use(cors())
app.use(express.json())
app.use('/api/outputs', express.static(OUTPUTS_DIR))

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
    filename: (_req, file, cb) => {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
      cb(null, `${unique}-${sanitizeFilename(file.originalname)}`)
    },
  }),
  fileFilter: (_req, file, cb) => {
    if (file.originalname.endsWith('.pcap')) {
      cb(null, true)
      return
    }
    cb(new Error('Only .pcap files are supported'))
  },
})

const runHistory = []

function sanitizeFilename(name) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_')
}

function executableAvailable(executablePath) {
  try {
    fs.accessSync(executablePath, fs.constants.X_OK)
    return true
  } catch (_error) {
    return false
  }
}

function parseIntegerMatch(output, pattern) {
  const match = output.match(pattern)
  if (!match) {
    return undefined
  }
  const value = Number(match[1])
  return Number.isFinite(value) ? value : undefined
}

function parseFloatMatch(output, pattern) {
  const match = output.match(pattern)
  if (!match) {
    return undefined
  }
  const value = Number(match[1])
  return Number.isFinite(value) ? value : undefined
}

function parseStats(output) {
  const blockedCount = output.match(/\[BLOCK(?:ED)?\]/g)?.length ?? 0

  return {
    totalPackets: parseIntegerMatch(output, /Total Packets:\s+([0-9]+)/),
    totalBytes: parseIntegerMatch(output, /Total Bytes:\s+([0-9]+)/),
    tcpPackets: parseIntegerMatch(output, /TCP Packets:\s+([0-9]+)/),
    udpPackets: parseIntegerMatch(output, /UDP Packets:\s+([0-9]+)/),
    forwarded: parseIntegerMatch(output, /Forwarded:\s+([0-9]+)/),
    dropped: parseIntegerMatch(output, /Dropped(?:\/Blocked)?:\s+([0-9]+)/),
    dropRatePercent: parseFloatMatch(output, /Drop Rate:\s+([0-9.]+)/),
    blockedEvents: blockedCount,
  }
}

function buildArgs(inputPath, outputPath, config) {
  const args = [inputPath, outputPath]

  for (const ip of config.blockIps || []) {
    args.push('--block-ip', ip)
  }

  for (const appName of config.blockApps || []) {
    args.push('--block-app', appName)
  }

  for (const domain of config.blockDomains || []) {
    args.push('--block-domain', domain)
  }

  if (config.engine === 'multi') {
    if (
      typeof config.lbs === 'number' &&
      Number.isInteger(config.lbs) &&
      config.lbs > 0
    ) {
      args.push('--lbs', String(config.lbs))
    }

    if (
      typeof config.fps === 'number' &&
      Number.isInteger(config.fps) &&
      config.fps > 0
    ) {
      args.push('--fps', String(config.fps))
    }
  }

  return args
}

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    analyzers: {
      multi: executableAvailable(ANALYZERS.multi),
      simple: executableAvailable(ANALYZERS.simple),
    },
  })
})

app.get('/api/runs', (_req, res) => {
  res.json(runHistory)
})

app.post('/api/analyze', upload.single('pcap'), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ message: 'PCAP file is required' })
    return
  }

  let config
  try {
    config = JSON.parse(req.body.config ?? '{}')
  } catch (_error) {
    res.status(400).json({ message: 'Invalid JSON in config field' })
    return
  }

  const engine = config.engine === 'simple' ? 'simple' : 'multi'
  const binaryPath = ANALYZERS[engine]

  if (!executableAvailable(binaryPath)) {
    res
      .status(400)
      .json({
        message: `Analyzer binary not found or not executable: ${binaryPath}`,
      })
    return
  }

  const runId = crypto.randomUUID()
  const outputFileName = `${runId}-output.pcap`
  const outputPath = path.join(OUTPUTS_DIR, outputFileName)
  const args = buildArgs(req.file.path, outputPath, { ...config, engine })

  const startedAt = Date.now()

  const result = await runAnalyzer(binaryPath, args, PROJECT_ROOT)
  const durationMs = Date.now() - startedAt

  if (result.code !== 0) {
    res.status(500).json({
      message: 'Analyzer execution failed',
      command: [binaryPath, ...args].join(' '),
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.code,
    })
    return
  }

  const payload = {
    runId,
    inputFile: req.file.originalname,
    outputFile: outputFileName,
    outputDownloadPath: `/api/outputs/${encodeURIComponent(outputFileName)}`,
    engine,
    command: [binaryPath, ...args].join(' '),
    durationMs,
    stats: parseStats(result.stdout),
    stdout: result.stdout,
    stderr: result.stderr,
    completedAt: new Date().toISOString(),
  }

  runHistory.unshift(payload)
  if (runHistory.length > 20) {
    runHistory.pop()
  }

  res.json(payload)
})

function runAnalyzer(command, args, cwd) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd })
    let stdout = ''
    let stderr = ''

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString()
    })

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })

    child.on('error', (error) => {
      stderr += error.message
      resolve({ code: -1, stdout, stderr })
    })

    child.on('close', (code) => {
      resolve({ code: code ?? -1, stdout, stderr })
    })
  })
}

app.listen(PORT, () => {
  process.stdout.write(`API server listening on http://localhost:${PORT}\n`)
})
