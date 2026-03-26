# Mini Healthcare Agent

Vercel deployment-oriented healthcare agent demo built around an `agent + skills + plugins` structure.

## Structure

```text
agent/
  healthcare-agent.ts
  types.ts
skills/
  emergency_guard.ts
  intent_classifier.ts
  response_writer.ts
  symptom_detector.ts
  symptom_search.ts
  web_search.ts
plugins/
  gemini-client.ts
  healthcare-db.ts
  tavily-search.ts
app/
  api/
    chat/route.ts
    diseases/route.ts
    health/route.ts
    search/route.ts
    symptoms/route.ts
  globals.css
  layout.tsx
  page.tsx
lib/
  csv.ts
database/
  schema.sql
data/
package.json
tsconfig.json
next.config.ts
```

## Local Run

```bash
npm install
npm run seed
npm run dev
```

Optional environment variables:

```bash
TAVILY_API_KEY=tvly-your_api_key
```

## API

- `GET /api/health`
- `POST /api/chat`
- `GET /api/symptoms`
- `GET /api/diseases?q=독감`
- `POST /api/search`

Example request:

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "content-type: application/json" \
  -d '{"message":"열이 나고 기침이랑 근육통이 있어요","language":"ko"}'
```

```bash
curl "http://localhost:3000/api/diseases?q=독감"
```

```bash
curl -X POST http://localhost:3000/api/search \
  -H "content-type: application/json" \
  -d '{"symptomIds":[1,2,6],"limit":5}'
```

## SQLite

- Local: `data/app.db`
- Vercel: `/tmp/mini-healthcare-agent.db`

Vercel filesystem is ephemeral, so SQLite data will not persist between deployments or cold starts. For a demo this is acceptable, but production should move to an external database.

## Seed Data

- `data/diseases.csv`
- `data/symptoms.csv`
- `data/disease_symptoms.csv`

These files are loaded into SQLite with `npm run seed`, and the app also auto-seeds them on first access if the deployed database is empty.

## Agent Design

`POST /api/chat` runs through a small agent pipeline.

- `agent/healthcare-agent.ts`
  Orchestrates which skill runs next and assembles the final result.
- `skills/emergency_guard.ts`
  Checks whether the message looks urgent and should bypass search.
- `skills/intent_classifier.ts`
  Uses Gemini to decide whether the question is healthcare-related.
- `skills/symptom_detector.ts`
  Detects symptom IDs from the local symptom catalog.
- `skills/symptom_search.ts`
  Runs symptom-to-disease candidate search against SQLite.
- `skills/web_search.ts`
  Falls back to Tavily when local data is not enough.
- `skills/response_writer.ts`
  Uses Gemini first to rewrite DB search results in a patient-friendly tone, then falls back to rule-based text if Gemini fails.
- `plugins/gemini-client.ts`
  Wraps Gemini generateContent calls for JSON classification and text generation.
- `plugins/healthcare-db.ts`
  Provides SQLite access and automatic CSV seeding.
- `plugins/tavily-search.ts`
  Wraps Tavily API access as a web-search plugin.

This layout is intended to make later OpenClaw integration easier by keeping the agent, skills, and tool plugins separate.
