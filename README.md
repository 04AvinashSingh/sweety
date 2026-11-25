# Sweety

A personal blood glucose tracker built with PostgreSQL, Express, React, Vite, Tailwind CSS and Recharts.

## Setup

Requires Node.js 20.19+ or 22.12+. External PostgreSQL mode also requires Docker or PostgreSQL 17.

1. Run `npm install` in this directory.
2. Copy `server/.env.example` to `server/.env` and replace `JWT_SECRET` with a random secret of at least 32 characters.
3. Run `docker compose up -d` to start PostgreSQL. If using an existing database, set `DATABASE_URL` accordingly.
4. Run `npm run migrate` and `npm run seed`.
5. Run `npm run dev`. Open http://localhost:5173. The API runs at http://localhost:3001.

### Local development without Docker

In `server/.env`, set `DB_DRIVER=pglite`, `PGLITE_DATA_DIR=.data/sweety`, and `SEED_DEMO=true`. Run `npm run dev` and open http://127.0.0.1:5173. The server creates the schema automatically before accepting requests. Local readings and accounts persist in `server/.data/sweety` across restarts and are ignored by Git.

### External PostgreSQL

Set `DB_DRIVER=postgres` and configure `DATABASE_URL`. Start PostgreSQL with `docker compose up -d`, then run `npm run migrate` and `npm run seed`. Startup validates connectivity before printing its ready message. The server exits with a configuration error when the selected database cannot be reached.

The server loads `.env` from its workspace directory. A root `.env.example` also documents the settings. Set `DB_SSL=true` when your database requires certificate-verified TLS.

Demo credentials are `demo@sweety.app` and `Password123!`. Seeding adds up to 180 readings within the current and previous month and preserves existing readings.

## Checks

Run `npm test` for Jest/Supertest API integration tests and Vitest/React Testing Library component tests. Tests use an isolated PGlite PostgreSQL engine and need no external database. Supertest uses a temporary local HTTP socket. On hosts that block local sockets, run `TEST_TRANSPORT=in-process npm test` to exercise Express with Node HTTP streams in process. Run `npm run build` for a production client build in `client/dist`.

## API

All endpoints except registration, login and health require `Authorization: Bearer <token>`.

| Method | Path                                          | Purpose                                  |
| ------ | --------------------------------------------- | ---------------------------------------- |
| POST   | /api/auth/register                            | Name, email, password registration       |
| POST   | /api/auth/login                               | Email and password login                 |
| GET    | /api/auth/me                                  | Current user                             |
| GET    | /api/health                                   | Database health                          |
| GET    | /api/readings?date=YYYY-MM-DD&page=1&limit=20 | Filtered, paginated readings             |
| POST   | /api/readings                                 | Create with reading_date, slot and value |
| PUT    | /api/readings/:id                             | Update supplied reading fields           |
| DELETE | /api/readings/:id                             | Delete owned reading                     |
| GET    | /api/reports/daily?date=YYYY-MM-DD            | Daily summary and readings               |
| GET    | /api/reports/month-to-date?date=YYYY-MM-DD    | Month start through reference date       |
| GET    | /api/reports/monthly?date=YYYY-MM-DD          | Whole previous calendar month            |

## Notes

### Assumptions and design choices

- Four fixed slots enforce a maximum of four readings through a unique database constraint. Mutations lock the user row inside a transaction before checking daily limits and duplicates.
- Create checks the daily limit before duplicate slots. Partial edits retain omitted fields and revalidate the full reading.
- Calendar dates stay as date strings. API future-date checks use `APP_TIMEZONE`, default Asia/Kolkata. Browser defaults follow its local calendar.
- Passwords are hashed with bcrypt. JWT tokens expire after seven days and are stored in `localStorage`. All data queries scope ownership to the authenticated user.
- Report aggregates use the complete selected period. Empty periods return count zero and null highest, lowest and average values. Aggregates are computed from retrieved readings, which also feed the chart.
- Value badge colors follow standard clinical glucose thresholds: 70–139 (in target), 140–180 (elevated), and below 70 or above 180 mg/dl (out of range).
- After `npm run build`, run `npm start` to serve the built application and API together on port 3001. Put HTTPS in front of the Node server for production and configure `CLIENT_ORIGIN` for the deployed origin.

### What I'd improve with more time

- Account password recovery / reset flow with email verification.
- Customizable target glucose thresholds per patient or doctor recommendation.
- Export reading data to CSV and PDF formats for physician visits.
- Rate limiting on authentication and mutation endpoints (e.g., `express-rate-limit`).
- Dockerfile multi-stage build packaging client and server into a single container.
- Background worker (BullMQ + Redis) sending scheduled email reminders to patients with fewer than 4 readings logged.
