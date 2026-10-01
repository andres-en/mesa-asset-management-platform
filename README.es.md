# Mesa — Asset Management Platform

[![CI](https://github.com/andres-en/mesa-asset-management-platform/actions/workflows/ci.yml/badge.svg)](https://github.com/andres-en/mesa-asset-management-platform/actions/workflows/ci.yml)
![Python](https://img.shields.io/badge/python-3.12-3776AB?logo=python&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-3-000000?logo=flask)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs)

*[Read in English](README.md)*

Gestión de activos de TI: una aplicación web para que los equipos de TI lleven el control del hardware de la empresa: el
inventario de equipos, quién tiene cada portátil y un acta de entrega firmada por cada préstamo. El
empleado puede firmar **a distancia** con un enlace de un solo uso que le llega por correo, y cada
cambio de estado queda en un historial de auditoría.

<!-- Capturas: agregar imágenes en docs/screenshots/ y descomentar.
![Dashboard](docs/screenshots/dashboard.png)
![Firma remota](docs/screenshots/remote-signature.png)
-->

## Puntos destacados

- **Ciclo de préstamo con reglas de integridad.** Un equipo solo se presta si está disponible; el
  estado "Prestado" solo lo pone o lo quita un préstamo (nunca a mano); la devolución envía el equipo
  a `Disponible` o a `Mantenimiento` según su estado.
- **Firma electrónica remota.** Si el empleado no está presente, la API le envía un enlace de firma
  por correo. El token es aleatorio, **se guarda solo como hash SHA-256**, expira (48 h por defecto),
  es de un solo uso y se puede regenerar. Un enlace vencido responde `410 Gone`.
- **Actas en PDF firmadas**, generadas con ReportLab e incluyendo ambas firmas (TI y empleado).
- **Historial de auditoría** de cada cambio de estado de un equipo, con quién lo hizo.
- **Manejo seguro de la sesión.** Intercambio del código de Google OAuth → JWT en una **cookie
  HttpOnly** con protección **CSRF de doble envío**, revocación del token en el servidor al cerrar
  sesión y tokens Bearer para clientes de la API.
- **Acceso por roles.** `admin` gestiona inventario, préstamos y usuarios; `viewer` es de solo
  lectura.
- **Validación de entradas.** Las firmas deben ser imágenes reales (se decodifican y verifican), las
  fechas se validan (`400`, nunca un `500`) y en producción la app no arranca sin sus secretos.
- **API documentada.** Swagger UI (Flasgger) en `/apidocs`, más una colección de Postman.

## Arquitectura

```mermaid
flowchart LR
    it([Equipo de TI]) --> web[Frontend<br/>Next.js + MUI]
    employee([Empleado]) -->|enlace de firma| web
    web -->|REST · cookie JWT + CSRF| api[API Flask<br/>gunicorn]
    api -->|intercambio de código OAuth| google[(Google)]
    api --> db[(PostgreSQL 16<br/>Flask-Migrate)]
    api -->|enlace de firma / avisos| smtp[(SMTP)]
    api --> pdf[ReportLab<br/>actas en PDF]
    api --> files[(Imágenes de firmas<br/>volumen)]
```

### Flujo de firma remota

```mermaid
sequenceDiagram
    actor IT as Equipo de TI
    participant API as API Flask
    participant DB as PostgreSQL
    actor Emp as Empleado
    IT->>API: POST /prestamos (firma_remota=true)
    API->>DB: préstamo + SHA-256(token), expiración
    API-->>Emp: correo con /firmar/{token}
    Emp->>API: GET /firma/{token}
    API->>DB: busca por hash, verifica expiración
    Emp->>API: POST /firma/{token} (PNG de la firma)
    API->>DB: guarda la firma, borra el token (un solo uso)
    API-->>IT: correo: "el acta fue firmada"
```

## Stack

| Capa | Tecnologías |
|---|---|
| Backend | Python 3.12, Flask 3, SQLAlchemy 2, Flask-Migrate (Alembic), flask-jwt-extended, gunicorn |
| Datos | PostgreSQL 16 |
| Documentos | ReportLab (PDF), Pillow (validación de firmas) |
| Frontend | Next.js 16, React 19, Material UI, Chart.js |
| Autenticación | Google OAuth 2.0, JWT en cookies HttpOnly + CSRF, lista de tokens revocados |
| Calidad | pytest (SQLite o PostgreSQL), ruff, ESLint, verificación de migraciones en CI |
| Entrega | Docker (Compose multi-servicio), GitHub Actions |

## Cómo empezar

```bash
cp .env.example .env       # definir SECRET_KEY, JWT_SECRET_KEY, Google OAuth y SMTP
docker compose up -d --build
```

El backend aplica las migraciones al arrancar. Luego:

| Servicio | URL |
|---|---|
| Frontend | <http://localhost:3000> |
| API | <http://localhost:5000> |
| Documentación de la API (Swagger UI) | <http://localhost:5000/apidocs> |

Solo pueden entrar usuarios registrados. Crear el primer administrador con tu correo de Google y
gestionar el resto desde la página **Users**:

```bash
docker compose exec backend flask seed-admin tu@ejemplo.com "Tu Nombre"
```

### Desarrollo local

```bash
cd backend
python -m venv .venv && source .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
cp .env.example .env
docker compose up -d db                               # stack solo backend (PostgreSQL)
flask db upgrade && python run.py                     # API en http://localhost:5000

cd ../my-app && npm install && npm run dev            # UI en http://localhost:3000
```

## Configuración

Ver [.env.example](.env.example) (stack completo) y [backend/.env.example](backend/.env.example).

| Variable | Descripción |
|---|---|
| `SECRET_KEY` / `JWT_SECRET_KEY` | Obligatorias en producción; la app no arranca sin ellas |
| `JWT_COOKIE_SECURE` / `JWT_COOKIE_SAMESITE` / `JWT_COOKIE_DOMAIN` | Configuración de la cookie de sesión (`JWT_COOKIE_SECURE=true` detrás de HTTPS) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REDIRECT_URI` | Cliente de Google OAuth |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` / `SMTP_FROM_EMAIL` | Correo saliente para los enlaces de firma |
| `SIGNING_BASE_URL` | Página del frontend que atiende `/firmar/{token}` |
| `SIGNATURE_TOKEN_EXPIRATION_HOURS` | Vigencia de un enlace de firma (48 por defecto) |
| `CORS_ORIGINS` | Orígenes del frontend permitidos |
| `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Configuración del frontend en tiempo de build |

## API

Referencia completa en `/apidocs`. Endpoints principales:

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| `GET` | `/auth/google` | Público | URL de inicio de sesión con Google |
| `POST` | `/auth/callback` | Público | Intercambia el código OAuth; crea la cookie de sesión |
| `GET` | `/auth/me` · `POST` `/auth/logout` | Con sesión | Usuario actual · cerrar sesión (revoca el token) |
| `GET/POST/DELETE` | `/auth/usuarios` | Admin | Gestión de usuarios |
| `GET` | `/dashboard` | Con sesión | Conteo de equipos por estado, firmas pendientes |
| `GET` | `/equipos` · `/equipos/{id}` | Con sesión | Inventario · equipo con préstamos e historial |
| `POST/PUT` | `/equipos` · `/equipos/{id}` | Admin | Registrar o actualizar equipos |
| `GET` | `/prestamos` · `/prestamos/{id}` | Con sesión | Préstamos (filtro por `estado`) |
| `POST` | `/prestamos` | Admin | Nuevo préstamo, con firma presencial o remota |
| `POST` | `/prestamos/{id}/reenviar-firma` | Admin | Regenera y reenvía el enlace de firma |
| `PUT` | `/prestamos/{id}/devolver` | Admin | Registra la devolución |
| `GET` | `/prestamos/{id}/pdf` | Con sesión | Acta firmada en PDF |
| `GET/POST` | `/firma/{token}` | Público (token) | Datos para la página de firma · enviar la firma |
| `GET` | `/historial` · `/historial/equipo/{id}` | Con sesión | Historial de cambios de estado |

## Modelo de datos

`usuarios` (usuarios y roles), `equipos`, `prestamos` (préstamos, firmas, hash y expiración del token
de firma), `historial_estados` (historial de cambios de estado) y `tokens_revocados` (JWT revocados).
Los cambios de esquema pasan por Flask-Migrate; el CI falla si los modelos y las migraciones no
coinciden.

## Pruebas

```bash
cd backend
pytest                                                   # SQLite, sin configuración previa
TEST_DATABASE_URL=postgresql://usuario:clave@localhost:5433/mesa_test pytest --cov=app
```

Los tests cubren el flujo de sesión con cookie + CSRF, la revocación de tokens, los permisos por rol
(el viewer es de solo lectura), el ciclo completo del préstamo (firma presencial y remota,
expiración, regeneración del enlace, un solo uso, devoluciones, generación del PDF), las reglas del
inventario y la especificación Swagger. El CI ejecuta lint, los tests sobre PostgreSQL,
`flask db upgrade` + `flask db check`, el lint y build del frontend, y los builds de Docker.

## Estructura del proyecto

```
backend/
├── app/
│   ├── routes/        # blueprints de Flask (auth, equipos, prestamos, firma, historial, dashboard)
│   ├── services/      # reglas de negocio, correo, PDF, firmas, OAuth
│   ├── models/        # modelos SQLAlchemy
│   └── utils/         # errores, tokens, verificación de roles
├── migrations/        # Flask-Migrate / Alembic
├── tests/
└── Mesa.postman_collection.json
my-app/                # frontend Next.js (App Router, MUI)
docker-compose.yml     # stack completo
```

## Créditos

Diseñado y construido por **Andres Estepa**. **Felipe Vargas** aportó el frontend inicial en Next.js
y el rediseño de las plantillas de correo y PDF.

## Autor

**Andres Estepa** — [github.com/andres-en](https://github.com/andres-en)

## Licencia

© 2026 Andres Estepa. Todos los derechos reservados. El código se publica con fines de portafolio;
no se otorga licencia para usarlo, copiarlo, modificarlo ni distribuirlo.
