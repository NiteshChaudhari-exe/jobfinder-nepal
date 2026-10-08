# JobFinder Nepal

JobFinder Nepal is a job marketplace MVP for candidates and employers. Candidates can browse published jobs and submit applications. Employers can create a company profile and manage job postings. Administrators can review listings.

This repository is an actively developed MVP, not a finished production service. See [Known limitations](#known-limitations) before treating every visible UI control as a completed feature.

## Start here

- New to the product? Read the [user guide](docs/user-guide.md).
- New to the code? Read the [architecture and developer guide](docs/architecture.md).

## Technology

- Frontend: React 18, TypeScript, Vite, React Router, Tailwind CSS
- Backend: Node.js, Express 4, Mongoose
- Database: MongoDB, locally or MongoDB Atlas
- Authentication: JWT bearer tokens and bcrypt password hashing
- Deployment configuration: Render backend in `render.yaml`; frontend can be deployed to a static host such as Vercel or Netlify

## Requirements

- Node.js 20.19+ or 22.12+ and npm (required by the current Vite toolchain)
- A MongoDB server, or a MongoDB Atlas database and connection string
- A private JWT secret of at least 32 characters

## Local setup

Run these commands from the repository root. npm workspaces install the client and server dependencies together.

### Windows PowerShell

```powershell
Copy-Item .\client\.env.example .\client\.env
Copy-Item .\server\.env.example .\server\.env
npm ci
```

Edit the local `.env` files:

- `client/.env`: set `VITE_API_URL` if the backend API is not at `http://localhost:5000/api`.
- `server/.env`: set `MONGO_URI` and replace the example `JWT_SECRET`.
- `server/.env`: set `CORS_ORIGIN` to the exact frontend origin(s), comma-separated if multiple.

Generate a JWT secret locally without putting it in chat or source control:

```powershell
$bytes = New-Object byte[] 48
[System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
[Convert]::ToBase64String($bytes)
```

Copy the output into `server/.env` as `JWT_SECRET`. Keep this value private.

Start MongoDB before starting the app. For a local MongoDB installation, the default URI is:

```text
mongodb://127.0.0.1:27017/jobfinder-nepal
```

For MongoDB Atlas, use the URI from Atlas **Connect → Drivers**, include a database name such as `jobfinder-nepal`, and ensure the database user's permissions and Atlas Network Access allow this machine to connect. Do not commit a real connection string. If a database password has ever been pasted into chat, logs, or source control, rotate it in Atlas and replace the URI in your local/deployment secret store.

Start the frontend and backend together:

```powershell
npm run dev
```

The frontend is normally available at `http://localhost:5173`; the API is at `http://localhost:5000/api`. Check `http://localhost:5000/api/health` for API health. The server logs `MongoDB connected` when its database connection succeeds.

MongoDB creates databases/collections as documents are first written. A successful connection alone does not populate the database; create an account, company, job, or application to see corresponding records in Atlas Data Explorer.

## Useful commands

Run from the repository root:

| Command | Purpose |
| --- | --- |
| `npm ci` | Install exact dependencies from the lockfile |
| `npm run dev` | Run client and server concurrently |
| `npm run build` | Type-check/build the client and run the server's placeholder build script |
| `npm test` | Run backend route security tests with Node's built-in test runner |
| `npm audit` | Audit dependencies in all npm workspaces |
| `npm audit --workspace client` | Audit frontend dependencies |

The route tests stub database calls and do not write to MongoDB. `npm run build` also does not exercise a live database connection.

## User flows

- **Candidate:** create a user account, browse/filter published jobs, open a listing, apply, and view personal applications at `/dashboard`.
- **Employer:** select the hiring account type during registration, then create a company profile, post jobs, and manage the employer's own jobs at `/employer-dashboard`.
- **Administrator:** review all jobs and approve/reject listings at `/admin-dashboard`. Public registration deliberately does not allow creating admin accounts; use a trusted, documented provisioning process instead.

For step-by-step product usage and current limitations, see the [user guide](docs/user-guide.md). For API authorization and implementation details, see the [developer guide](docs/architecture.md).

## Environment files and secrets

The committed `.env.example` files are templates only. Local `.env` files are ignored by Git. Never put database credentials, JWT secrets, or production tokens into a source file, issue, screenshot, or commit. If a secret is shared or committed, rotate it at its source.

The backend requires `JWT_SECRET` to be configured with at least 32 characters. Rotating it invalidates existing login tokens.

## Deployment

### Frontend on Vercel

The client folder includes `vercel.json` for its Vite build output and React Router history fallback.

1. Import `NiteshChaudhari-exe/jobfinder-nepal` into Vercel.
2. When Vercel detects multiple applications, import the `client` application as a standalone project. Keep its detected project root directory set to `client`.
3. Add the environment variable `VITE_API_URL` with the deployed backend API URL ending in `/api` (for example, `https://your-api.example.com/api`).
4. Deploy. Copy the final production domain exactly as shown by Vercel, including `https://` and excluding a trailing slash.

### Backend on Render

`render.yaml` describes the backend service. Configure `MONGO_URI` as a private deployment setting using the rotated Atlas database credential; the Render configuration generates `JWT_SECRET`.

After Vercel creates the production domain, set Render's `CORS_ORIGIN` to that exact origin, for example `https://your-project.vercel.app`. If you later use a custom domain, add its exact origin as a comma-separated entry. Do not use a wildcard in production. Redeploy the backend after changing environment variables.

The frontend's `VITE_API_URL` is embedded at frontend build time; redeploy the frontend after changing it.

Before a public production deployment, verify HTTPS, logging, backups, rate limiting, account provisioning, data retention, and dependency audit results. Production startup now requires both `MONGO_URI` and `CORS_ORIGIN`; CORS allows only configured origins.

## Known limitations

- The job listing page can show built-in demo entries if the API errors or returns an empty list. Those entries are not MongoDB records and their IDs cannot be used to apply.
- Applications now collect a resume URL and cover letter; uploading a resume file is not implemented.
- The Google sign-in button is presentation-only; OAuth is not wired up.
- Candidate dashboard saved-job and resume counts are placeholders.
- A notification model and route file exist, but the route is not mounted by the Express app and notifications are not a delivered product flow.
- The admin account bootstrap process is not automated. Do not enable public admin registration.
- The server package's `build` script is a placeholder; the server runs JavaScript directly with Node.

These notes describe the current implementation, not a guarantee of production readiness. Update them when features become functional.
