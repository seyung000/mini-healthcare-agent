# Mini Healthcare Agent

Vercel deployment-oriented minimal TypeScript scaffold using Next.js and SQLite.

## Structure

```text
app/
  api/
    chat/route.ts
    health/route.ts
  page.tsx
lib/
  agent.ts
  db.ts
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

These files are loaded into SQLite with `npm run seed`.

## Chat Search Routing

`POST /api/chat` now tries to decide whether the user message should trigger symptom search.

- The app first tries local symptom-name matching against the SQLite symptom catalog.
- If matching symptoms produce disease candidates, it returns ranked local results.
- If local matching is not enough and `TAVILY_API_KEY` is set, it falls back to Tavily web search.
- Tavily is used only as a general-information fallback, not as a diagnosis engine.
