# ITAM

ITAM is a Django-based internal tool for tracking company IT assets, assignments, and maintenance history. It replaces spreadsheet-based tracking with a managed workflow for asset availability, employee assignment, returns, servicing, and reporting.

## Features

- Dashboard with total assets, availability, assignment, maintenance, employee, and overdue-service metrics.
- Full CRUD for assets and employees.
- Admin-only asset assignment and return workflows.
- Per-asset maintenance log history with add, edit, delete, and "maintenance done" actions.
- Asset filtering by type and status.
- Case-insensitive duplicate serial-number validation.
- Django Admin configuration with list displays, filters, and search.
- CSV export for asset reporting.
- Login, signup, and logout screens.

## Tech Stack

- Python / Django 5.x
- PostgreSQL via Supabase
- `django-environ` for environment configuration
- `gunicorn` and `whitenoise` for production hosting

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
