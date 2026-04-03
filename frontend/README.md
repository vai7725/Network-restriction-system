# Packet Analyzer Web Frontend

React + TypeScript dashboard with an Express API bridge for running `nrs_engine` and `nrs_simple`.

## Prerequisites

- Node.js 18+
- Existing analyzer binaries in project root:
  - `../nrs_engine`
  - `../nrs_simple`

## Run in development

```bash
cd frontend
npm install
npm run dev
```

- UI: `http://localhost:5173`
- API: `http://localhost:8787`

## API Endpoints

- `GET /api/health` - Analyzer availability
- `POST /api/analyze` - Multipart form data:
  - `pcap`: `.pcap` file
  - `config`: JSON string
- `GET /api/runs` - In-memory latest run list
- `GET /api/outputs/:filename` - Download generated output PCAP

### `config` example

```json
{
  "engine": "multi",
  "blockIps": ["192.168.1.50"],
  "blockApps": ["YouTube"],
  "blockDomains": ["facebook.com"],
  "lbs": 2,
  "fps": 2
}
```
