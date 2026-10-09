# IMS Deployment Guide

Production deployment checklist for the Institute Management System (Next.js 16 + PostgreSQL).

## Requirements

| Component | Version |
|-----------|---------|
| Node.js | 20 LTS or newer |
| PostgreSQL | 14+ |
| OS | Linux (recommended), Windows Server, or container host |

## Environment variables

Copy `.env.example` to `.env` and set:

| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `SESSION_SECRET` | Yes | Min 32 random chars in production |
| `NEXT_PUBLIC_APP_URL` | Yes | Public URL, e.g. `https://ims.yourschool.edu.pk` |
| `INTEGRATIONS_SANDBOX` | Prod | Set `false` when live payment/SMS keys are configured |
| JazzCash / Easypaisa / Twilio / SMTP / WhatsApp | Optional | See `.env.example` |

Generate a session secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## First-time setup

```bash
npm ci
npm run db:generate
npm run db:push
npm run db:seed    # demo data — skip or customize for production
npm run build
npm run start
```

Default demo Super Admin: `super@ims.cloud` / `super123` — **change or remove before go-live**.

## Production build

```bash
npm run build
npm run start
```

Or use PM2:

```bash
pm2 start npm --name ims -- start
pm2 save
```

## Reverse proxy (Nginx)

```nginx
server {
  listen 443 ssl http2;
  server_name ims.yourschool.edu.pk;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

## Database backup

**Platform + school workspaces** live in PostgreSQL (`SchoolTenant.workspace` JSON + platform tables).

Daily backup example:

```bash
pg_dump -Fc -h localhost -U postgres ims > ims-backup-$(date +%F).dump
```

Per-school export is also available in **Settings → Backup** (JSON download).

## File uploads

Uploaded documents are stored under `public/uploads/{tenantId}/`. Back up this folder with the database or migrate to S3-compatible storage for scale.

## Security hardening

- Use HTTPS only; cookies are `httpOnly` and should be `secure` in production (configure via reverse proxy / Next.js deployment).
- Rotate `SESSION_SECRET` invalidates all sessions.
- Set strong PostgreSQL credentials; restrict DB to app server IP.
- Disable demo accounts or re-seed with production-only users.
- Set `INTEGRATIONS_SANDBOX=false` only after validating live gateway credentials.
- Optional: rate-limit `/api/auth/login` at the reverse proxy.

## Health checks

| Check | Command / URL |
|-------|----------------|
| App up | `GET /login` returns 200 |
| DB | `npm run db:studio` or `psql $DATABASE_URL -c 'SELECT 1'` |
| Tests | `npm test` |
| Typecheck | `npx tsc --noEmit` |

## Upgrades

```bash
git pull
npm ci
npm run db:generate
npm run db:push      # or prisma migrate deploy if using migrations
npm run build
pm2 restart ims
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Login redirect loop | Check `SESSION_SECRET` is set and stable |
| School data 403 | Tenant suspended/expired — Super Admin → Schools |
| Seat limit on save | Plan max students/staff — upgrade plan or reduce records |
| Payments sandbox only | Set gateway env keys + `INTEGRATIONS_SANDBOX=false` |
