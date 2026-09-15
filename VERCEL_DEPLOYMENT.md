# Deploy LuxOne to Vercel

This repository deploys as two Vercel projects connected to the same Git repository.

## 1. Backend project

Create a Vercel project and set its **Root Directory** to `Backend`. The included
`Backend/vercel.json` exposes Django through the Python runtime.

Add these environment variables for Production and Preview:

```dotenv
DJANGO_SECRET_KEY=<generate-a-long-random-value>
DEBUG=false
ALLOWED_HOSTS=.vercel.app
DATABASE_URL=<your-neon-postgresql-url-with-sslmode=require>
DB_SSLMODE=require

FRONTEND_URL=https://<frontend-project>.vercel.app
CORS_ALLOW_ALL_ORIGINS=false
CORS_ALLOWED_ORIGINS=https://<frontend-project>.vercel.app
CORS_ALLOWED_ORIGIN_REGEXES=^https://[a-z0-9-]+\.vercel\.app$
CSRF_TRUSTED_ORIGINS=https://<frontend-project>.vercel.app

SECURE_SSL_REDIRECT=true
SESSION_COOKIE_SECURE=true
CSRF_COOKIE_SECURE=true
SECURE_HSTS_SECONDS=31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS=true
SECURE_HSTS_PRELOAD=true

EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.zeptomail.in
EMAIL_PORT=587
EMAIL_USE_TLS=true
EMAIL_USE_SSL=false
EMAIL_HOST_USER=emailapikey
EMAIL_HOST_PASSWORD=<your-zeptomail-smtp-token>
DEFAULT_FROM_EMAIL=LuxmorOne@luxmorai.com
LOG_LEVEL=INFO
```

Do not upload `Backend/.env`; it is excluded from Git and Vercel uploads.

Run migrations against the production database before deploying schema changes:

```powershell
cd Backend
python manage.py migrate --noinput
python manage.py create_default_admin
```

After deployment, verify:

```text
https://<backend-project>.vercel.app/health/
https://<backend-project>.vercel.app/swagger/
```

## 2. Frontend project

Create another Vercel project from the same repository. Either leave its **Root
Directory** at the repository root (the root `vercel.json` delegates the build
to `frontend`) or set it to `frontend`. Both configurations build the same Vite
application and include the required SPA rewrite.

Add this build-time environment variable for Production and Preview:

```dotenv
VITE_API_BASE_URL=https://<backend-project>.vercel.app
```

Deploy the backend first, add its final URL to the frontend variable, then deploy
the frontend. Finally, put the frontend's final URL into the backend's
`FRONTEND_URL`, `CORS_ALLOWED_ORIGINS`, and `CSRF_TRUSTED_ORIGINS`, and redeploy
the backend.

## File uploads

Vercel Functions have ephemeral local storage. The backend uses `/tmp/media` on
Vercel so request-time file handling does not fail, but uploaded files will not
persist between function invocations. Configure an external Django storage
backend (for example, S3-compatible object storage) before relying on Documents,
attachments, campaign uploads, or completion-proof uploads in production.
