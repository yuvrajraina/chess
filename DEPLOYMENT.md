# Deployment

This app has two deployable parts:

- `backend/`: Django + DRF + Channels ASGI API/websocket server.
- `frontend/`: React static build.

## Recommended free setup

Use this split for the current repo:

- Frontend: Netlify
- Backend: Render Web Service
- Database: Neon Postgres

The repo includes:

- `netlify.toml`: builds the React app from `frontend/` and serves it as a single-page app.
- `render.yaml`: deploys the Django backend from `backend/` on Render.
- `backend/.python-version`: pins Render's Python runtime family to Python 3.13.

### 1. Create the Neon database

Create a Neon project and copy its Postgres connection string. Use the direct connection string for `DATABASE_URL`.

### 2. Deploy the backend to Render

Create the Render service from `render.yaml` or use these manual settings:

```bash
Root Directory: backend
Build Command: pip install -r requirements.txt && python manage.py collectstatic --noinput && python manage.py migrate
Start Command: daphne -b 0.0.0.0 -p $PORT config.asgi:application
```

Set these Render environment variables:

```bash
DJANGO_DEBUG=false
DJANGO_SECRET_KEY=<generate a long secret>
DJANGO_ALLOWED_HOSTS=.onrender.com
DATABASE_URL=<your Neon connection string>
CORS_ALLOWED_ORIGINS=https://<your-netlify-site>.netlify.app
CSRF_TRUSTED_ORIGINS=https://<your-netlify-site>.netlify.app
```

After deploy, note the Render backend URL, for example:

```bash
https://chess-backend.onrender.com
```

### 3. Deploy the frontend to Netlify

Create a Netlify site from the same repo. The included `netlify.toml` sets:

```bash
Base directory: frontend
Build command: npm run build
Publish directory: build
```

Set these Netlify environment variables:

```bash
REACT_APP_API_BASE_URL=https://<your-render-backend>.onrender.com/api
REACT_APP_WS_BASE_URL=wss://<your-render-backend>.onrender.com/ws
GENERATE_SOURCEMAP=false
```

Redeploy Netlify after setting these variables. If your Netlify site URL changes, update `CORS_ALLOWED_ORIGINS` and `CSRF_TRUSTED_ORIGINS` on Render.

## Backend

Install dependencies:

```bash
cd backend
python -m pip install -r requirements.txt
```

Set environment variables from `backend/.env.example`. At minimum for production:

```bash
DJANGO_DEBUG=false
DJANGO_SECRET_KEY=replace-with-a-long-random-secret
DJANGO_ALLOWED_HOSTS=api.example.com
CORS_ALLOWED_ORIGINS=https://app.example.com
CSRF_TRUSTED_ORIGINS=https://app.example.com
```

Recommended for production:

```bash
DATABASE_URL=postgresql://user:password@host:5432/dbname
REDIS_URL=redis://host:6379/0
```

Run database setup:

```bash
python manage.py migrate
python manage.py collectstatic --noinput
```

Run the ASGI server:

```bash
daphne -b 0.0.0.0 -p 8000 config.asgi:application
```

For platforms that use a `Procfile`, `backend/Procfile` is included.

## Frontend

Set build-time environment variables from `frontend/.env.example`:

```bash
REACT_APP_API_BASE_URL=https://api.example.com/api
REACT_APP_WS_BASE_URL=wss://api.example.com/ws
GENERATE_SOURCEMAP=false
```

Build:

```bash
cd frontend
npm ci
npm run build
```

Deploy `frontend/build/` to your static host. If you serve frontend and backend from the same domain, route `/api/*` to Django HTTP and `/ws/*` to Django websocket.

## Notes

- `DJANGO_DEBUG=false` enables secure-cookie and HSTS defaults.
- `REDIS_URL` is strongly recommended for websocket reliability when scaling beyond one process.
- Tokens are stored in `localStorage` in this version. For a higher-security deployment, move authentication to HttpOnly secure cookies.
