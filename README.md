# TripForge

TripForge is a complete trip planning app with a React + Vite + TypeScript client, a FastAPI API, and PostgreSQL storage. It includes account sign-in, destination discovery, trip and itinerary editing, expense tracking, and invitation-based collaboration with viewer and editor roles.

## What’s included

- Email and password registration and sign-in using Argon2 password hashes and expiring JWT access tokens.
- Destination discovery with search, region filters, estimated daily costs, ratings, and curated starter data.
- Trip creation, editing, deletion, trip dates, traveler counts, budgets, currencies, and notes.
- Day-by-day itineraries with editable days and activities, time, location, category, estimate, notes, and completion status.
- Expense creation, editing, deletion, category, date, payer, and budget progress.
- Trip invitations by email with a secure accept link. Trip owners choose viewer or editor access; API permissions are enforced server-side.
- Responsive dashboard and mobile layout.
- PostgreSQL schema migration, repeatable destination seeding, example environment file, and Windows helper scripts.

## Requirements

- Windows 10 or 11.
- Python 3.11 or newer.
- Node.js 20 or newer (npm is included with the Windows Node.js installer).
- PostgreSQL 16 or newer.

## Install PostgreSQL on Windows

1. Download the current Windows installer from the [official PostgreSQL Windows download page](https://www.postgresql.org/download/windows/). The page links to the EDB installer and describes its included PostgreSQL server and pgAdmin tools.
2. Run the installer and include PostgreSQL Server, Command Line Tools, and pgAdmin. The default port 5432 is suitable for local development.
3. Set a password for the built-in postgres administrator and keep it somewhere you can retrieve. Finish the install and leave the PostgreSQL Windows service running.
4. Open SQL Shell (psql) from the Start menu (or use pgAdmin’s Query Tool). Connect to the local server as postgres, using port 5432 and the password you just set.
5. Run the following statements one at a time:

   ~~~sql
   CREATE ROLE tripforge WITH LOGIN PASSWORD 'choose-a-local-password';
   CREATE DATABASE tripforge OWNER tripforge;
   ~~~

   PostgreSQL roles and databases use the standard CREATE ROLE and CREATE DATABASE commands; see the PostgreSQL docs for [roles](https://www.postgresql.org/docs/current/sql-createrole.html) and [database creation](https://www.postgresql.org/docs/current/manage-ag-createdb.html). If you already created either object, skip that statement.

6. Copy .env.example to .env at the TripForge project root. Set DATABASE_URL with the password from step 5, for example:

   ~~~text
   DATABASE_URL=postgresql+psycopg://tripforge:choose-a-local-password@localhost:5432/tripforge
   ~~~

   If the password contains URL-reserved characters, percent-encode those characters in the connection URL. Keep .env private; it is excluded from the ZIP-ready source folder by .gitignore.

## Install and run

The setup-windows.bat helper installs the Python and frontend packages and creates .env from the example if needed. You can also do it manually:

1. From the TripForge folder, create and activate a Python environment and install the API packages:

   ~~~powershell
   py -3 -m venv backend\.venv
   .\backend\.venv\Scripts\Activate.ps1
   python -m pip install --upgrade pip
   python -m pip install -r backend\requirements.txt
   ~~~

2. Install frontend packages:

   ~~~powershell
   cd frontend
   npm install
   cd ..
   ~~~

3. Apply the database migration and add the discovery destinations:

   ~~~powershell
   cd backend
   alembic upgrade head
   python -m app.seed
   ~~~

   When you change SQLAlchemy models later, create and review a migration from the backend folder with Alembic’s autogenerator:

   ~~~powershell
   alembic revision --autogenerate -m "describe the change"
   alembic upgrade head
   ~~~

4. Start the API from the backend folder:

   ~~~powershell
   python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
   ~~~

   API health check: http://127.0.0.1:8000/api/health. Interactive API docs: http://127.0.0.1:8000/api/docs.

5. In a second terminal, start the web app:

   ~~~powershell
   cd frontend
   npm run dev
   ~~~

   Open http://127.0.0.1:5173. Create an account to start planning.

The scripts start-backend.bat and start-frontend.bat provide the same local startup flow. The backend script reapplies migrations and seeds destinations before launching the API; seeding is safe to repeat.

## Invitations and permissions

On a trip’s Travelers tab, the owner enters an email and chooses Can view or Can edit. TripForge displays a high-entropy invitation token as a copyable link; share it with the invitee. No email delivery service is configured. The invitee must register or sign in with the invited email address, then open the link or accept the invitation from the app. Owners can change roles or remove access. Viewers can read a trip but cannot make changes; editors can update trip details, itinerary, and expenses. Only the owner can manage access or delete the trip.

## Tests and checks

Install the development test dependencies and run the API tests:

~~~powershell
cd backend
python -m pip install -r requirements-dev.txt
python -m pytest tests -q
~~~

Build and type-check the frontend:

~~~powershell
cd frontend
npm run build
~~~

## Project layout

~~~text
TripForge/
  backend/
    app/              FastAPI routes, models, validation, auth, and seed data
    migrations/       Alembic configuration and initial PostgreSQL schema
    tests/            API and access-control tests
  frontend/
    src/              React application, API client, and responsive styles
  .env.example
  README.md
  setup-windows.bat
  start-backend.bat
  start-frontend.bat
~~~

This package contains application source and local setup helpers. It does not include containers, deployment pipelines, cloud resources, or other DevOps infrastructure.
