# ITAM V4

**ITAM V4** is a Django-based IT Asset Management platform for tracking company assets, employees, assignments, and maintenance — replacing spreadsheet workflows with a managed, real-time system.

Version **4.0** focuses on faster in-page workflows, richer dashboard visuals, and a more polished admin experience.

## What's new in V4

- **Add Asset / Add Employee modals** — create records in place (no full-page forms); legacy `/assets/add/` and `/employees/add/` URLs redirect into the modal flow
- **Glass action dock** on the assets page for Add, Import, and Export
- **Redesigned asset filters** with labeled controls, active filter chips, and contextual clear
- **Living dashboard sky** — continuous day/night cycle, organic clouds, and atmospheric welcome header
- **Stronger analytics** — composition, growth, maintenance, and activity views with clearer summaries
- **API-backed creates** that sync inventory tables, notifications, and report metrics

## Features

- Dashboard with fleet overview, utilization, health, and overdue-service signals
- Full CRUD for assets and employees (admin)
- Asset assignment and return workflows
- Per-asset maintenance log history with add, edit, delete, and “maintenance done”
- Asset filtering by type and status
- Case-insensitive duplicate serial-number validation
- CSV import and export for inventory migration and reporting
- Admin and employee portals with role-appropriate navigation
- Notifications for creates, assignments, and related activity
- Login, password reset, and logout screens

## Tech Stack

- Python / Django 5.x
- PostgreSQL via Supabase
- `django-environ` for environment configuration
- `gunicorn` and `whitenoise` for production hosting
- Render runtime pinned via `runtime.txt`

## Version

| Field | Value |
|--------|--------|
| Product | ITAM System |
| Release | **V4** (`4.0`) |
| Source of truth | `inventory/version.py` |

The sidebar footer and page context use `ITAM_VERSION` / `ITAM_PRODUCT_NAME` from that module.

## Local Setup

1. Create and activate a virtual environment.
2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Copy `.env.example` to `.env` and fill in your Supabase database credentials.
4. Apply migrations:

```bash
python manage.py migrate
```

5. Create an admin user:

```bash
python manage.py createsuperuser
```

6. Run the development server:

```bash
python manage.py runserver
```

## Verification

Run the test suite:

```bash
python manage.py test inventory
```

Run Django system checks:

```bash
python manage.py check
```

## Deployment

The repository includes `render.yaml` for Render deployment. Configure the required database environment variables in Render:

- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `DB_HOST`
- `DB_PORT`
- `DB_SSLMODE`
- `DB_GSSENCMODE`

Render runs `collectstatic`, applies migrations on start, and serves the app through Gunicorn.
