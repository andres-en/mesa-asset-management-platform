# Mesa — Asset Management Platform

[![CI](https://github.com/andres-en/mesa-asset-management-platform/actions/workflows/ci.yml/badge.svg)](https://github.com/andres-en/mesa-asset-management-platform/actions/workflows/ci.yml)
![Python](https://img.shields.io/badge/python-3.12-3776AB?logo=python&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-3-000000?logo=flask)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs)

*[Leer en español](README.es.md)*

IT asset management: a web app for IT teams to keep track of company hardware: the device inventory, who has each laptop,
and a signed hand-over receipt for every loan. Employees can sign **remotely** through a single-use
link sent by email, and every status change is kept in an audit history.

<!-- Screenshots: add images to docs/screenshots/ and uncomment.
![Dashboard](docs/screenshots/dashboard.png)
![Remote signature](docs/screenshots/remote-signature.png)
-->

## Highlights

- **Loan lifecycle with integrity rules.** A device can only be loaned while it is available; the
  on-loan status can only be set or cleared by a loan (never by hand); returns route the device back
  to `Disponible` or to `Mantenimiento` depending on its condition.
- **Remote e-signature.** When the employee is not present, the API emails a signing link. The token
  is random, **stored only as a SHA-256 hash**, expires (48 h by default), is single-use and can be
  rotated. Expired links answer `410 Gone`.
- **Signed PDF receipts** generated with ReportLab, including both signatures (IT and employee).
- **Audit history** of every device status change, with who made it.
- **Secure session handling.** Google OAuth code exchange → JWT in an **HttpOnly cookie** with
  **CSRF double-submit** protection, server-side token revocation on logout, and Bearer tokens for
  API clients.
- **Role-based access.** `admin` manages the inventory, loans and users; `viewer` is read-only.
- **Input hardening.** Signatures must be real images (decoded and verified), dates are validated
  (`400`, never a `500`), and production refuses to start without its secrets.
- **Documented API.** Swagger UI (Flasgger) at `/apidocs`, plus a Postman collection.

## Architecture

```mermaid
flowchart LR
    it([IT staff]) --> web[Next.js + MUI<br/>frontend]
    employee([Employee]) -->|signing link| web
    web -->|REST · JWT cookie + CSRF| api[Flask API<br/>gunicorn]
    api -->|OAuth code exchange| google[(Google)]
    api --> db[(PostgreSQL 16<br/>Flask-Migrate)]
    api -->|signing link / notifications| smtp[(SMTP)]
    api --> pdf[ReportLab<br/>PDF receipts]
    api --> files[(Signature images<br/>volume)]
```

### Remote signature flow

```mermaid
sequenceDiagram
    actor IT as IT staff
    participant API as Flask API
    participant DB as PostgreSQL
    actor Emp as Employee
    IT->>API: POST /prestamos (firma_remota=true)
    API->>DB: loan + SHA-256(token), expiry
    API-->>Emp: email with /firmar/{token}
    Emp->>API: GET /firma/{token}
    API->>DB: look up by hash, check expiry
    Emp->>API: POST /firma/{token} (signature PNG)
    API->>DB: store signature, clear token (single use)
    API-->>IT: email: "the receipt was signed"
```

## Tech stack

| Layer | Technologies |
|---|---|
| Backend | Python 3.12, Flask 3, SQLAlchemy 2, Flask-Migrate (Alembic), flask-jwt-extended, gunicorn |
| Data | PostgreSQL 16 |
| Documents | ReportLab (PDF), Pillow (signature validation) |
| Frontend | Next.js 16, React 19, Material UI, Chart.js |
| Auth | Google OAuth 2.0, JWT in HttpOnly cookies + CSRF, token blocklist |
| Quality | pytest (SQLite or PostgreSQL), ruff, ESLint, migration drift check in CI |
| Delivery | Docker (multi-service Compose), GitHub Actions |

## Getting started

```bash
cp .env.example .env       # set SECRET_KEY, JWT_SECRET_KEY, Google OAuth and SMTP values
docker compose up -d --build
```

The backend applies the migrations on start-up. Then:

| Service | URL |
|---|---|
| Frontend | <http://localhost:3000> |
| API | <http://localhost:5000> |
| API docs (Swagger UI) | <http://localhost:5000/apidocs> |

Sign-in is restricted to registered users. Create the first administrator with your Google email,
then manage the rest from the **Users** page:

```bash
docker compose exec backend flask seed-admin you@example.com "Your Name"
```

### Local development

```bash
cd backend
python -m venv .venv && source .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
cp .env.example .env
docker compose up -d db                               # backend-only stack (PostgreSQL)
flask db upgrade && python run.py                     # API on http://localhost:5000

cd ../my-app && npm install && npm run dev            # UI on http://localhost:3000
```

## Configuration

See [.env.example](.env.example) (full stack) and [backend/.env.example](backend/.env.example).

| Variable | Description |
|---|---|
| `SECRET_KEY` / `JWT_SECRET_KEY` | Required in production; the app refuses to start without them |
| `JWT_COOKIE_SECURE` / `JWT_COOKIE_SAMESITE` / `JWT_COOKIE_DOMAIN` | Session cookie settings (`JWT_COOKIE_SECURE=true` behind HTTPS) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REDIRECT_URI` | Google OAuth client |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` / `SMTP_FROM_EMAIL` | Outgoing email for signing links |
| `SIGNING_BASE_URL` | Frontend page that serves `/firmar/{token}` |
| `SIGNATURE_TOKEN_EXPIRATION_HOURS` | Lifetime of a signing link (default 48) |
| `CORS_ORIGINS` | Allowed frontend origins |
| `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Frontend build-time settings |

## API

Full reference at `/apidocs`. Main endpoints (resource names are in Spanish: *equipos* = devices,
*préstamos* = loans, *firma* = signature, *historial* = history):

| Method | Path | Access | Description |
|---|---|---|---|
| `GET` | `/auth/google` | Public | Google sign-in URL |
| `POST` | `/auth/callback` | Public | Exchanges the OAuth code; sets the session cookie |
| `GET` | `/auth/me` · `POST` `/auth/logout` | Signed in | Current user · sign out (revokes the token) |
| `GET/POST/DELETE` | `/auth/usuarios` | Admin | User management |
| `GET` | `/dashboard` | Signed in | Device counts by status, pending signatures |
| `GET` | `/equipos` · `/equipos/{id}` | Signed in | Inventory · device with loans and history |
| `POST/PUT` | `/equipos` · `/equipos/{id}` | Admin | Register or update devices |
| `GET` | `/prestamos` · `/prestamos/{id}` | Signed in | Loans (filter by `estado`) |
| `POST` | `/prestamos` | Admin | New loan, with an in-person or remote signature |
| `POST` | `/prestamos/{id}/reenviar-firma` | Admin | Rotate and resend the signing link |
| `PUT` | `/prestamos/{id}/devolver` | Admin | Register the return |
| `GET` | `/prestamos/{id}/pdf` | Signed in | Signed PDF receipt |
| `GET/POST` | `/firma/{token}` | Public (token) | Remote signature page data · submit the signature |
| `GET` | `/historial` · `/historial/equipo/{id}` | Signed in | Status change history |

## Data model

`usuarios` (users and roles), `equipos` (devices), `prestamos` (loans, signatures, signing-token hash
and expiry), `historial_estados` (status change history) and `tokens_revocados` (revoked JWTs).
Schema changes go through Flask-Migrate; CI fails if the models and the migrations drift apart.

## Testing

```bash
cd backend
pytest                                                   # SQLite, no setup needed
TEST_DATABASE_URL=postgresql://user:pass@localhost:5433/mesa_test pytest --cov=app
```

The tests cover the cookie + CSRF session flow, token revocation, role permissions (viewers are
read-only), the full loan lifecycle (in-person and remote signatures, expiry, link rotation,
single use, returns, PDF generation), inventory rules and the Swagger spec. CI runs lint, the tests on
PostgreSQL, `flask db upgrade` + `flask db check`, the frontend lint and build, and the Docker builds.

## Project structure

```
backend/
├── app/
│   ├── routes/        # Flask blueprints (auth, equipos, prestamos, firma, historial, dashboard)
│   ├── services/      # business rules, email, PDF, signatures, OAuth
│   ├── models/        # SQLAlchemy models
│   └── utils/         # errors, tokens, role checks
├── migrations/        # Flask-Migrate / Alembic
├── tests/
└── Mesa.postman_collection.json
my-app/                # Next.js frontend (App Router, MUI)
docker-compose.yml     # full stack
```

## Credits

Designed and built by **Andres Estepa**. **Felipe Vargas** contributed the initial Next.js frontend
and the redesigned email and PDF templates.

## Author

**Andres Estepa** — [github.com/andres-en](https://github.com/andres-en)

## License

© 2026 Andres Estepa. All rights reserved. The source code is published for portfolio purposes;
no license is granted to use, copy, modify or distribute it.
