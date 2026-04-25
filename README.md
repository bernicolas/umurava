# Umurava Talent AI — AI-Powered Talent Screening Platform

An AI-powered recruitment screening tool built for the **Umurava AI Hackathon**. The platform enables recruiters to create job listings, ingest candidates (from structured profiles or uploaded resumes/spreadsheets), and run AI-driven screening to produce ranked shortlists with transparent, explainable reasoning.

## Live Demo

- **Frontend:** https://umurava-hr.vercel.app
- **Backend API:** https://umurava-server.onrender.com

## 📚 Documentation & Resources

-   **📖 User Manual** - [Click here to read the user manual](https://docs.google.com/document/d/1PYqIWASZxxxUZDKGnmggOANyneqmEQBWsdhNLI1nixE/edit?usp=sharing)
-   **📊 Google Slides Presentation** - [Click here to view the slide deck](https://docs.google.com/document/d/1UxApHAto5eaYfqoyQVbSbs6Wiz_Gc_sNuu19L_XtE_0/edit?usp=sharing)

**Demo Accounts:**

| Role      | Email                 | Password       |
| --------- | --------------------- | -------------- |
| Admin     | admin@umurava.com     | Admin1234!     |
| Recruiter | demo@umurava.com      | Demo1234!      |
| Recruiter | recruiter@umurava.com | Recruiter1234! |


## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                       │
│  ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌──────────────────┐  │
│  │  Auth    │ │  Jobs    │ │ Applicant │ │  AI Screening    │  │
│  │  Pages   │ │  CRUD    │ │ Upload    │ │  Results & Rank  │  │
│  └────┬─────┘ └────┬─────┘ └─────┬─────┘ └────────┬─────────┘  │
│       └─────────────┴─────────────┴────────────────┘            │
│                Redux Toolkit + TanStack Query                   │
└──────────────────────────────┬──────────────────────────────────┘
                               │ REST API (Axios)
┌──────────────────────────────┴──────────────────────────────────┐
│                    Backend (Node.js + Express)                   │
│  ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌──────────────────┐  │
│  │  Auth    │ │  Job     │ │ Applicant │ │  Screening       │  │
│  │  JWT +   │ │  Routes  │ │ Ingestion │ │  Orchestration   │  │
│  │  Google  │ │          │ │ + Parse   │ │                  │  │
│  └──────────┘ └──────────┘ └───────────┘ └────────┬─────────┘  │
│                                                    │            │
│                MongoDB (Mongoose)                   │            │
└────────────────────────────────────────────────────┼────────────┘
                                                     │
                               ┌─────────────────────┴────────────┐
                               │        Gemini API (Google AI)     │
                               │  ┌─────────────────────────────┐  │
                               │  │ Multi-candidate evaluation  │  │
                               │  │ Weighted scoring algorithm  │  │
                               │  │ Explainable recommendations │  │
                               │  │ Resume → Profile parsing    │  │
                               │  └─────────────────────────────┘  │
                               └───────────────────────────────────┘
```

## Tech Stack

| Layer            | Technology                           |
| ---------------- | ------------------------------------ |
| Language         | TypeScript (strict mode)             |
| Frontend         | Next.js 16, React 19                 |
| State Management | Redux Toolkit + TanStack React Query |
| Styling          | Tailwind CSS 4                       |
| Backend          | Node.js, Express                     |
| Database         | MongoDB (Mongoose ODM)               |
| AI / LLM         | Google Gemini API (mandatory)        |
| Auth             | JWT + Google OAuth 2.0               |
| File Parsing     | pdf-parse, xlsx                      |
| Validation       | Zod (client), express-validator      |
| Testing          | Jest , super-test                    |
| Documentation    | Swagger                              |
| Containerization | Docker                               |

## Key Features

## Key Features

### Core Screening Features

#### Scenario 1: Screening from Umurava Platform

- Recruiter creates job with title, description, requirements, skills, experience
- Structured talent profiles (matching Umurava schema) are submitted as JSON
- AI evaluates all applicants in a single prompt against the job criteria
- Produces a ranked Top 10 or Top 20 shortlist

#### Scenario 2: Screening from External Sources

- Manually entered job details
- Upload CSV / Excel spreadsheets with candidate data
- Upload PDF resumes — Gemini AI parses unstructured resumes into structured profiles
- Same AI screening pipeline produces ranked shortlists

### Advanced Features

- **Multi-Model AI Fallback Chain** - Automatically falls back from gemini-2.5-flash → gemini-2.0-flash → gemini-2.0-flash-lite
- **Batch Screening** - Process large applicant pools (70+ candidates) in optimized batches
- **Weighted Scoring Algorithm** - Configurable weights for skills (35%), experience (30%), education (15%), projects (15%), availability (5%)
- **Explainable AI Outputs** - Each candidate includes strengths, gaps, and personalized recommendations
- **Screening History Audit Trail** - Complete history of all screening runs with timestamps
- **Talent Pool Management** - Build and manage reusable candidate pools
- **Real-time Notifications** - Email and in-app notifications for screening completion
- **Combining shortlist from screening history** - combine 2 or more screen history to average the best

### Administrative Features

- Role-based access control (Admin, Recruiter, Candidate)
- Admin user management dashboard


### AI Screening Output (per candidate)

- **Rank** (1–N)
- **Match Score** (0–100, weighted)
- **Strengths** (2–4 items)
- **Gaps / Risks** (2–4 items)
- **Recommendation** (2–3 sentence explanation)

### Additional Features

- Responsive design (mobile + desktop)
- Google OAuth integration
- Rate limiting and security headers

## AI Decision Flow




### Small jobs (≤ 30 applicants) — single call

Recruiter clicks "Run Screening" → server responds 202 immediately
Screening runs as a background job (setImmediate) — recruiter can
navigate away freely without killing the process
System loads all applicants for the job
Job details + all candidate profiles assembled into one structured prompt
Prompt includes weighted scoring criteria:

Skills match:                    35%
Relevant experience (years + quality): 30%
Education relevance:             15%
Projects & certifications:       15%
Availability alignment:           5%


Before calling Gemini, the system probes which model is currently
reachable (tiny test prompt) and picks the page size accordingly:

gemini-2.5-flash available  → 30 candidates per prompt (~67k tokens)
gemini-2.0-flash only       → 10 candidates per prompt (~22k tokens)
gemini-2.0-flash-lite only  → 10 candidates per prompt


Prompt sent to Gemini with structured JSON schema enforcement
(responseMimeType: "application/json" + responseSchema)
AI returns a scored JSON array — every candidate gets:
matchScore (0–100), criteriaScores breakdown, strengths, gaps, recommendation
Response validated and parsed (3-strategy JSON extractor as safety net)
Result stored in ScreeningResult, history entry written to ScreeningHistory
SSE notification fired → frontend invalidates queries → shortlist appears


### Large jobs (> 30 applicants) — paginated background processing

Recruiter clicks "Run Screening" → server responds 202 immediately
runPaginatedScreening() launched via setImmediate (true background job)
— recruiter can leave the page, close the tab, do anything —
the job keeps running on the server
System probes Gemini to detect the available model and picks page size:

gemini-2.5-flash → 30 per page
fallback models  → 10 per page


Applicants split into pages of that size
For each page:
a. The existing single-call screenApplicants() is called unchanged
— it handles its own model fallback internally
b. AI scores ALL candidates on the page (not just top N) so no one
is dropped before the global sort
c. Raw scores saved to ScreeningRawScores collection after each page
(persists across server restarts)
d. SSE batch-progress event fired → frontend progress panel updates live
showing which batch is active, how many applicants scored so far
e. 62-second pause between pages so the Gemini per-minute quota
window fully resets before the next call
If a page fails (429 quota / 503 overload):
— System reads the retryDelay from the API error response
(e.g. "retryDelay":"58s") and waits exactly that long + 3s buffer
— Retries the same page up to 3 times before giving up on it
— Never silently skips — only moves on after all retries exhausted
— Other pages continue regardless so partial results are preserved
Model fallback chain (fires automatically if primary model is unavailable):
gemini-2.5-flash  (250k tokens/min, 30 candidates/prompt)
↓ 429 / 503 / timeout
gemini-2.0-flash  (32k tokens/min,  10 candidates/prompt)
↓ 429 / 503
gemini-2.0-flash-lite (32k tokens/min, 10 candidates/prompt)
When a fallback model is used, the prompt is automatically rebuilt
with fewer candidates so it fits within that model's token limit
Once all pages complete:
— All raw scores loaded from ScreeningRawScores
— Global sort by matchScore descending
— Top shortlistSize candidates selected
— Global ranks 1..N reassigned
— ScreeningRawScores deleted (keeps DB small)
— Final result written to ScreeningResult + ScreeningHistory
— screening_done SSE fired → frontend shows the shortlist automatically
Recruiter views ranked shortlist with per-candidate explanations
(strengths, gaps, AI recommendation, criteria score breakdown)


### Prompt engineering

AI role: "expert technical recruiter"
Job context and all candidate profiles included for cross-comparison
Scoring formula embedded verbatim so the model computes it exactly
Output schema strictly specified with JSON schema enforcement
Strengths and gaps limited to 2–4 items each (concise, job-specific)
Custom recruiter instructions injected at highest priority if set
Minimum score gate enforced both in the prompt AND server-side
(double enforcement — AI instruction + hard filter after response)



### Resume Parsing Flow (Scenario 2 — PDF)

```
1. Recruiter uploads a PDF resume
2. pdf-parse extracts raw text from the document
3. Extracted text is sent to Gemini API with a structured extraction prompt
4. Gemini returns a TalentProfile JSON matching the Umurava schema
5. Profile is validated and stored as an applicant
6. Applicant enters the normal screening pipeline
```

### Prompt Engineering Notes

- System prompt establishes the AI as an "expert technical recruiter"
- Job context and all candidate profiles are included in a single prompt for cross-comparison
- Scoring criteria are explicitly weighted and documented in the prompt
- Output schema is strictly specified with validation rules
- The AI is instructed to provide job-specific reasoning (not generic)
- Strengths and gaps are limited to 2–4 items each for conciseness

## Setup Instructions

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- Google Gemini API key

### 1. Clone the repository

```bash
git clone <repo-url>
cd umurava_hr
```

### 2. Server setup

```bash
cd server
npm install
cp .env.example .env   # then fill in your values
npm run seed            # seed demo data
npm run dev             # starts on port 5000
```

### 3. Client setup

```bash
cd client
npm install
cp .env.example .env.local  # then fill in your values
npm run dev                  # starts on port 3000
```

## Environment Variables

### Server (`server/.env`)

| Variable               | Description                       | Example                                             |
| ---------------------- | --------------------------------- | --------------------------------------------------- |
| `MONGODB_URI`          | MongoDB connection string         | `mongodb+srv://...`                                 |
| `JWT_SECRET`           | Secret key for JWT signing        | `<random 64-char hex>`                              |
| `JWT_EXPIRES_IN`       | Token expiry duration             | `7d`                                                |
| `GEMINI_API_KEY`       | Google Gemini API key             | `AIza...`                                           |
| `CLIENT_URL`           | Frontend URL (CORS origin)        | `http://localhost:3000`                             |
| `PORT`                 | Server port                       | `5000`                                              |
| `NODE_ENV`             | Environment                       | `development`                                       |
| `GOOGLE_CLIENT_ID`     | Google OAuth client ID (optional) | `xxx.apps.googleusercontent.com`                    |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret (optional)    | `GOCSPX-xxx`                                        |
| `GOOGLE_REDIRECT_URI`  | OAuth callback URL (optional)     | `http://localhost:5000/api/v1/auth/google/callback` |

### Client (`client/.env.local`)

| Variable              | Description          | Example                        |
| --------------------- | -------------------- | ------------------------------ |
| `NEXT_PUBLIC_API_URL` | Backend API base URL | `http://localhost:5000/api/v1` |

## API Endpoints

| Method | Path                                      | Description              |
| ------ | ----------------------------------------- | ------------------------ |
| POST   | `/api/v1/auth/register`                   | Register new account     |
| POST   | `/api/v1/auth/login`                      | Login                    |
| GET    | `/api/v1/auth/me`                         | Get current user         |
| GET    | `/api/v1/auth/google`                     | Start Google OAuth       |
| GET    | `/api/v1/auth/google/callback`            | Google OAuth callback    |
| GET    | `/api/v1/jobs`                            | List jobs (paginated)    |
| POST   | `/api/v1/jobs`                            | Create job               |
| GET    | `/api/v1/jobs/:id`                        | Get job details          |
| PUT    | `/api/v1/jobs/:id`                        | Update job               |
| DELETE | `/api/v1/jobs/:id`                        | Delete job               |
| GET    | `/api/v1/jobs/:jobId/applicants`          | List applicants for job  |
| POST   | `/api/v1/jobs/:jobId/applicants/platform` | Add structured profiles  |
| POST   | `/api/v1/jobs/:jobId/applicants/upload`   | Upload CSV/Excel         |
| POST   | `/api/v1/jobs/:jobId/applicants/resume`   | Upload PDF resume        |
| DELETE | `/api/v1/jobs/:jobId/applicants/:id`      | Delete applicant         |
| POST   | `/api/v1/jobs/:jobId/screening/trigger`   | Trigger AI screening     |
| GET    | `/api/v1/jobs/:jobId/screening/result`    | Get screening results    |
| GET    | `/api/v1/jobs/:jobId/screening/history`   | Get screening history    |
| GET    | `/api/v1/admin/users`                     | List all users (admin)   |
| PATCH  | `/api/v1/admin/users/:id/role`            | Update user role (admin) |
| GET | `/api/v1/settings` | Get system settings |
| PUT | `/api/v1/settings` | Update system settings |
| GET | `/api/v1/email-settings` | Get email configuration |
| PUT | `/api/v1/email-settings` | Update email configuration |
| GET | `/api/v1/notifications` | Get user notifications |
| PUT | `/api/v1/notifications/:id/read` | Mark notification as read |
| DELETE | `/api/v1/notifications/:id` | Delete notification |
| GET | `/api/v1/talent-pool` | List talent pool candidates |
| POST | `/api/v1/talent-pool` | Add to talent pool |
| DELETE | `/api/v1/talent-pool/:id` | Remove from talent pool |
| GET | `/api/v1/auth/verify-invite` | validate invite token |
| POST | `/api/v1/auth/mark-invite-used` | — consume invite token |
| POST | `/api/v1/admin/invite` | - admin sends recruiter invite |
| GET  |`/api/v1/jobs/:jobId/screening/history/:historyId` | get a specific history |
| POST | `/api/v1/jobs/:jobId/screening/trigger-paginated` | the new paginated screening endpoint |

## Talent Profile Schema Compliance

The system strictly follows the Umurava Talent Profile Schema:

- **Basic Information:** firstName, lastName, email, headline, bio, location
- **Skills:** name, level (Beginner/Intermediate/Advanced/Expert), yearsOfExperience
- **Languages:** name, proficiency (Basic/Conversational/Fluent/Native)
- **Work Experience:** company, role, startDate, endDate, description, technologies, isCurrent
- **Education:** institution, degree, fieldOfStudy, startYear, endYear
- **Certifications:** name, issuer, issueDate
- **Projects:** name, description, technologies, role, link, startDate, endDate
- **Availability:** status, type, startDate
- **Social Links:** linkedin, github, portfolio, and extensible

## Assumptions & Limitations

1. **AI Output Quality** — Gemini responses may vary slightly between runs. The system validates and filters malformed entries.
2. **Resume Parsing** — PDF parsing accuracy depends on document structure. Scanned image PDFs are not supported.
3. **Token Limits** — Very large numbers of applicants (100+) in a required  waiting for the gemini model token to reset before sending another batch , thus taking some time.
4. **Model Fallback** — If the primary Gemini model is unavailable, the system falls back through gemini-2.5-flash → gemini-2.0-flash → gemini-2.0-flash-lite.
5. **Human-in-the-Loop** — AI produces recommendations only. Final hiring decisions remain with the recruiter.
6. **Authentication** — Google OAuth is optional; email/password auth works independently.
7. **Shortlist Size** — Fixed at 10 or 20 candidates as specified in the challenge requirements.

## Project Structure

```
umurava_hr/
├── client/                    # Next.js frontend
│   ├── src/
│   │   ├── app/               # App router pages
│   │   │   ├── (auth)/        # Login, register, OAuth callback
│   │   │   ├── (dashboard)/   # Protected dashboard routes
│   │   │   │   ├── admin/     # Admin user management
│   │   │   │   ├── applicants/# Applicant management
│   │   │   │   ├── dashboard/ # Dashboard overview
│   │   │   │   ├── jobs/      # Job CRUD + detail views
│   │   │   │   └── screening/ # AI screening hub
│   │   │   └── unauthorized/  # Access denied page
│   │   ├── components/
│   │   │   ├── features/      # Domain components
│   │   │   ├── layout/        # Shell, header, sidebar
│   │   │   └── ui/            # Design system primitives
│   │   ├── hooks/             # Custom hooks
│   │   ├── lib/               # Axios, query client, utils
│   │   ├── services/          # API service hooks
│   │   ├── store/             # Redux store + slices
│   │   └── types/             # TypeScript interfaces
│   └── package.json
├── server/                    # Express backend
│   ├── src/
│   │   ├── config/            # DB connection, env config
│   │   ├── controllers/       # Route handlers
│   │   ├── middleware/        # Auth, validation, upload
│   │   ├── models/            # Mongoose schemas
│   │   ├── routes/            # API routes
│   │   ├── scripts/           # Seed script
│   │   ├── services/          # Gemini AI, file parsing
│   │   ├── types/             # TypeScript types
│   │   └── utils/             # Helpers (JWT, errors, responses)
│   └── package.json
└── README.md
```




# Make the setup easier with Docker 

### start the container

```bash
docker compose up --build
```

This starts one container:
- `umurava-hr-client` — the Next.js app on port `3000`

###  Verify it's running

```bash
docker compose ps
```

Then visit:

```
http://localhost:3000
```

## Common commands

```bash
# Start (first time or after code changes)
docker compose up --build

# Start (no code changes)
docker compose up

# Start in background
docker compose up -d

# Stop the container
docker compose down

# View live logs
docker compose logs -f client
```

## Running alongside the backend

Make sure the backend is running first. In a separate terminal, go to the server repo and run:

```bash
docker compose up
```

Then start the client:

```bash
docker compose up --build
```

Both will be available at:
- Frontend → `http://localhost:3000`
- Backend API → `http://localhost:5000`

## ⚠️ Important: Environment Variables for Docker

When running with Docker, copy `server/.env.example` to `server/.env` and fill in
your values before running `docker compose up --build`.

The following variables are **required** for full functionality:

| Variable | Required | Notes |
|---|---|---|
| `MONGODB_URI` | ✅ | Use `mongodb://mongo:27017/umurava_hr` when running in Docker (not localhost) |
| `JWT_SECRET` | ✅ | Any long random string — generate with `openssl rand -hex 64` |
| `GEMINI_API_KEY` | ✅ | Get from [Google AI Studio](https://aistudio.google.com/) |
| `CLIENT_URL` | ✅ | Set to `http://localhost:3000` for local Docker |
| `GOOGLE_CLIENT_ID` | ⚪ | Only needed if using Google OAuth login |
| `GOOGLE_CLIENT_SECRET` | ⚪ | Only needed if using Google OAuth login |
| `GOOGLE_REDIRECT_URI` | ⚪ | Set to `http://localhost:5000/api/v1/auth/google/callback` |

> **Docker-specific note:** When running via Docker Compose, change `MONGODB_URI`
> from `mongodb://localhost:27017/...` to `mongodb://mongo:27017/...` — `mongo`
> is the internal Docker service name, not `localhost`.

Without `GEMINI_API_KEY` the AI screening feature will not work.
Without `JWT_SECRET` no one can log in.
Everything else is optional depending on which features you use.

