# VedaAI — AI Assessment Creator

Full-stack app for teachers to generate structured exam papers using AI.
Built for the VedaAI Full Stack Engineering Assignment.

## Stack

**Frontend** — Next.js 14 (App Router) · TypeScript · Tailwind · Zustand · Socket.IO client
**Backend** — Node 20 · Express · TypeScript · MongoDB (Mongoose) · Redis · BullMQ · Socket.IO · OpenAI SDK (structured outputs) · Zod · pdfkit · JWT auth (bcrypt + httpOnly cookies)
**Infra (local)** — Docker Compose (Mongo + Redis)
**Infra (deployed)** — Vercel (frontend) · Render (backend + worker) · MongoDB Atlas · Upstash Redis

## Architecture

```
┌──────────────┐   POST /api/assignments     ┌───────────────┐
│  Next.js     │ ─────────────────────────▶  │  Express API  │
│  (Form/UI)   │                             └──────┬────────┘
│              │   WS subscribe(:id)                │ enqueue
│              │ ◀────────── socket ─────────┐      ▼
└──────┬───────┘                             │  ┌─────────┐
       │                                     │  │ BullMQ  │
       │ poll/get                            │  │ (Redis) │
       ▼                                     │  └────┬────┘
┌──────────────┐                             │       │ process
│  Output page │ ◀────── mongo ──────────────┘       ▼
│  + PDF       │                             ┌───────────────┐
└──────────────┘                             │ Worker        │
                                             │  → Anthropic  │
                                             │  → Zod parse  │
                                             │  → Mongo save │
                                             │  → WS emit    │
                                             └───────────────┘
```

### Flow
1. Teacher fills the create form → `POST /api/assignments`.
2. Backend validates with Zod, persists to Mongo with `status=queued`, enqueues a BullMQ job.
3. Worker picks up the job, builds a structured prompt, calls Claude with a forced tool-call schema (`submit_question_paper`), validates the tool's input via Zod, saves sections into Mongo, and emits `assignment:update` + `assignment:complete` over the Socket.IO room `assignment:<id>`.
4. Frontend's detail page subscribes to that room, shows live progress, then renders the structured exam-paper layout. Teacher can regenerate or download a PDF (`html2pdf.js`).

### Why structured outputs?
The spec explicitly says "Do not directly render LLM response." We use OpenAI's strict-mode `response_format: { type: "json_schema" }` to constrain the model to a typed shape, then re-validate the parsed JSON against a Zod schema before persisting. The UI only ever renders typed, validated data — never raw model text.

## Local setup

### Prerequisites
- Node 20+
- Docker (for Mongo + Redis) — or supply your own instances
- An [OpenAI API key](https://platform.openai.com/api-keys)

### 1. Start infra
```bash
docker compose up -d
```
This brings up MongoDB on `:27017` and Redis on `:6379`.

### 2. Backend
```bash
cd backend
cp .env.example .env       # then set OPENAI_API_KEY
npm install
npm run dev                # http://localhost:4000
```

### 3. Frontend
```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev                # http://localhost:3000
```

Open <http://localhost:3000>, fill the form, hit **Generate paper**.

## Features

### Required
- ✅ Assignment creation form (title, subject, grade, due date, types, counts, marks, instructions)
- ✅ File upload (PDF + text) — parsed server-side via `pdf-parse`
- ✅ Validation: empty/negative/future-date checks on both client and server (Zod)
- ✅ Zustand (form + student-info stores, persisted)
- ✅ WebSocket (Socket.IO) for live job progress and completion
- ✅ Node + Express + TypeScript backend
- ✅ MongoDB persistence (assignments + generated sections)
- ✅ Redis + BullMQ background jobs
- ✅ AI generation via OpenAI with strict JSON-schema structured outputs → Zod validation
- ✅ Sections (A, B, ...) with title + instruction + questions; each question carries text / difficulty / marks
- ✅ Output page: student info inputs (name / roll / section), section-grouped questions, difficulty badges, marks per question, exam-paper typography

### Bonuses
- ✅ PDF export (`html2pdf.js`, A4 with print-tuned CSS)
- ✅ Regenerate action
- ✅ Difficulty badges (Easy / Moderate / Hard color-coded)
- ✅ Mobile responsive layout
- ✅ Assignments list page

## API

| Method | Path                                   | Purpose                                |
| ------ | -------------------------------------- | -------------------------------------- |
| POST   | `/api/assignments`                     | Create + enqueue                       |
| GET    | `/api/assignments`                     | List recent                            |
| GET    | `/api/assignments/:id`                 | Fetch one                              |
| POST   | `/api/assignments/:id/regenerate`      | Re-queue generation                    |
| POST   | `/api/assignments/upload`              | Upload PDF/text, returns parsed text   |
| WS     | `subscribe(assignmentId)`              | Join room for that assignment          |
| WS     | `assignment:update` / `:complete`      | Server-emitted events                  |

## Project layout

```
vedaAi/
├── docker-compose.yml
├── README.md
├── backend/
│   ├── src/
│   │   ├── index.ts          # express + socket + worker bootstrap
│   │   ├── worker.ts         # BullMQ worker (also runnable standalone)
│   │   ├── ai.ts             # OpenAI call + JSON schema + Zod parse
│   │   ├── queue.ts          # BullMQ queue
│   │   ├── socket.ts         # Socket.IO server + emit helpers
│   │   ├── schemas.ts        # Zod input + paper schemas
│   │   ├── db.ts             # mongoose connect
│   │   ├── redis.ts          # ioredis connection
│   │   ├── env.ts            # env loader
│   │   ├── models/Assignment.ts
│   │   └── routes/assignments.ts
│   ├── package.json
│   └── tsconfig.json
└── frontend/
    ├── src/
    │   ├── app/
    │   │   ├── layout.tsx
    │   │   ├── page.tsx              # create form
    │   │   ├── globals.css
    │   │   ├── assignments/page.tsx  # list
    │   │   └── assignments/[id]/page.tsx
    │   ├── components/
    │   │   ├── QuestionPaper.tsx
    │   │   └── DifficultyBadge.tsx
    │   └── lib/
    │       ├── api.ts
    │       ├── socket.ts
    │       ├── store.ts
    │       └── types.ts
    ├── tailwind.config.ts
    └── package.json
```

## Approach notes

- **Don't render raw LLM**: enforced by OpenAI strict `response_format: { type: "json_schema" }` + Zod schema match on the parsed JSON. Failures throw and the job is marked failed.
- **Progressive UI**: socket events update a `<ProgressCard />` so the teacher sees what's happening (queued → processing → done) instead of staring at a spinner.
- **Print-friendly output**: the question paper uses serif body type, hierarchical sectioning, and `@media print` rules so the PDF (and browser print) match a real exam paper.
- **State**: form state in Zustand (persisted to localStorage so an accidental refresh doesn't kill the form), student fields in a separate non-persistent store.
- **Validation parity**: same shape validated on the client and re-validated on the server with Zod.

## Deployment

The stack is designed to deploy free-tier:

| Layer | Service | Notes |
|---|---|---|
| Frontend | **Vercel** | Connect this repo, root dir = `frontend/`. Set `NEXT_PUBLIC_API_URL` + `NEXT_PUBLIC_SOCKET_URL` to your backend URL. |
| Backend (API + worker + sockets) | **Render** (Web Service, free) | Connect this repo, root dir = `backend/`. Build: `npm install && npm run build`. Start: `npm start`. Free tier sleeps after 15 min idle → first request after sleep takes ~30s. |
| MongoDB | **MongoDB Atlas** (M0 free) | Create cluster → DB user → network access `0.0.0.0/0` (or Render IPs) → grab connection string |
| Redis | **Upstash Redis** (free) | Create database → grab the `rediss://` URL → use it as `REDIS_URL` (note: ioredis client needs to parse this — see `redis.ts`) |

### Required env vars (Render backend)

```
PORT=4000
FRONTEND_ORIGIN=https://your-frontend.vercel.app
MONGO_URI=mongodb+srv://...        # from Atlas
REDIS_HOST=...                     # from Upstash
REDIS_PORT=6379
REDIS_PASSWORD=...                 # from Upstash
REDIS_TLS=true                     # Upstash requires TLS
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
JWT_SECRET=<generate a long random string>
COOKIE_NAME=vedaai_session
NODE_ENV=production
```

### Required env vars (Vercel frontend)

```
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com
NEXT_PUBLIC_SOCKET_URL=https://your-backend.onrender.com
```

### Post-deploy checklist
1. Verify `https://your-backend.onrender.com/health` returns `{"ok":true}`
2. Visit your Vercel URL → should redirect to `/login`
3. Sign up → create assignment → confirm streaming + PDF download
4. If cookies don't persist across origins, ensure backend `cors({ credentials: true, origin: FRONTEND_ORIGIN })` matches the exact Vercel URL (no trailing slash)
