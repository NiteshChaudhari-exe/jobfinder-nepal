# Architecture and developer guide

This guide describes the implementation as it exists in the repository. It is intended to help a new contributor find the right module, understand authorization boundaries, and run the application safely.

## Request and application flow

```text
Browser
  └── React app (client/src)
       ├── React Router pages
       ├── AuthContext: current user and persisted JWT
       └── shared Axios client
             └── Express API (/api)
                   ├── route modules
                   ├── JWT and role middleware
                   └── Mongoose models
                         └── MongoDB
```

The root npm project uses workspaces for `client` and `server`. `npm run dev` starts Vite and the Express process together. The server connects to MongoDB before it begins listening.

## Repository map

| Path | Responsibility |
| --- | --- |
| `client/src/main.tsx` | Mounts React, browser routing, and global styles |
| `client/src/App.tsx` | Maps browser paths to page components and installs the auth provider |
| `client/src/context/AuthContext.tsx` | Login/register/logout state, current-user hydration, and token persistence |
| `client/src/lib/api.ts` | Shared Axios base URL, authorization headers, and API error normalization |
| `client/src/pages/` | Home, jobs, job detail, sign-in, candidate dashboard, employer dashboard, admin dashboard |
| `client/src/styles.css` | Global styles and Tailwind directives |
| `server/src/index.js` | Loads server env, configures middleware/routes, validates JWT secret, connects MongoDB, starts HTTP server |
| `server/src/middleware/auth.js` | JWT authentication and role authorization |
| `server/src/routes/` | HTTP handlers for auth, jobs, employers, and applications |
| `server/src/models/` | Mongoose schemas for users, companies, jobs, applications, notifications |
| `docs/` | Maintainer and product onboarding documentation |
| `render.yaml` | Render backend deployment declaration |

`server/src/routes/notifications.js` and `Notification.js` are currently not connected to the Express app. Do not assume their endpoints are available.

## Identity and authorization

- The API issues a signed JWT after successful registration or login. The client stores it in browser `localStorage` and sends it as a bearer token for authenticated calls.
- `requireAuth` verifies the token and puts its identity/role on `req.user`.
- `requireRole(...)` checks role authorization after authentication.
- Public registration supports `user` and `employer` only. Admin access must be provisioned through a trusted process; there is no admin bootstrap command or seed script in this project.
- The browser signup UI allows candidate and employer roles; public registration still rejects admin accounts.
- Job mutation checks ownership against the authenticated employer. Admins may manage all jobs.
- Application lists are scoped to the candidate, the employer's own jobs, or the administrator.
- Password hashes are excluded from normal User queries by the schema. Authentication explicitly selects the password hash only for password comparison.
- Do not rely on frontend route visibility for security. Authorization must be enforced on the API.

## Route reference

All routes are prefixed by `/api`. Requests that require authentication need `Authorization: Bearer <token>`.

### Health and authentication

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| GET | `/health` | Public | Basic process health response (does not independently verify MongoDB health) |
| POST | `/auth/register` | Public | Create a candidate or employer account |
| POST | `/auth/login` | Public | Verify credentials and issue a JWT |
| GET | `/auth/me` | Authenticated | Return the current user's public identity |

### Jobs

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| GET | `/jobs` | Public | Search/filter published jobs |
| GET | `/jobs/me` | Employer/admin | List jobs owned by the current user |
| GET | `/jobs/moderation` | Admin | List jobs across all statuses |
| GET | `/jobs/:id` | Public | Return a job only when its status is `Published`; unpublished and missing jobs both return 404 |
| POST | `/jobs` | Employer/admin | Create a job; employer ownership comes from the JWT |
| PATCH | `/jobs/:id` | Owner/admin | Edit job details |
| PATCH | `/jobs/:id/status` | Owner/admin | Employer can set `Published` or `Draft`; admin can also set `Rejected` or `Hidden` |
| DELETE | `/jobs/:id` | Owner/admin | Delete a job |

`/jobs/me` and `/jobs/moderation` are declared before `/:id` so Express does not interpret those fixed route names as job IDs.

Public job listing filters include `search`, `location`, `category`, `jobType`, and `minSalary`. The public listing and detail handler both limit results to published jobs.

### Employers and companies

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| GET | `/employers` | Public | List public company fields |
| GET | `/employers/me` | Employer/admin | List companies owned by the current user |
| POST | `/employers` | Employer/admin | Create a company owned by the current user |

The public company endpoint must not populate or return private account records.

### Applications

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| GET | `/applications/me` | Authenticated | List the current user's applications |
| GET | `/applications` | Authenticated | List own applications; employer-owned job applications; or all for admin |
| POST | `/applications` | Authenticated | Apply as the current user |
| PATCH | `/applications/:id` | Applicant, job owner, or admin | Applicant may edit resume/cover-letter fields; employer/admin may update status subject to authorization |

## Data model

- **User** (`User.js`): name, normalized email, password hash (excluded from default selection), role (`user`, `employer`, `admin`), profile, saved jobs.
- **Company** (`Company.js`): name, unique slug, description, website, location, logo URL, owner User reference.
- **Job** (`Job.js`): title, description, Company and employer references, location, optional salary bounds, job type, category, requirements, moderation/publication status, timestamps, applicant references.
- **Application** (`Application.js`): Job and applicant references, resume URL, cover letter, status, timestamps.
- **Notification** (`Notification.js`): user reference, title, message, read flag. Schema only; currently unused by the API.

Mongoose creates collections as documents are first inserted. A successful database connection does not create or seed sample records automatically.

## Local development

1. From the repository root, copy `client/.env.example` to `client/.env` and `server/.env.example` to `server/.env`.
2. Set `MONGO_URI`, a private `JWT_SECRET` of at least 32 characters, and `CORS_ORIGIN` in `server/.env`.
3. Set `VITE_API_URL` in `client/.env` if the API is not at `http://localhost:5000/api`.
4. Run `npm ci` from the root.
5. Start MongoDB, then run `npm run dev` from the root.
6. Check `http://localhost:5000/api/health` and `http://localhost:5173`.

Never paste `.env` contents into issues or documentation. If a credential is exposed, rotate it in the database/hosting provider and replace it locally.

## Validation

- `npm run build`: TypeScript-check and bundle the client; server build currently only prints a placeholder message.
- `npm audit`: review dependency advisories for all workspaces.
- `npm audit --workspace client`: focus on frontend and development-tool packages.
- `npm test`: run the backend route authorization tests; model calls are stubbed so tests do not write to MongoDB.

When changing protected routes, check both positive and negative cases: correct role and owner succeeds; unauthenticated, wrong role, and wrong owner fail. When changing public listing behavior, verify draft/rejected/hidden jobs cannot be read publicly by ID. A successful build and the unit tests do not replace a separate live MongoDB smoke test.

## Implementation caveats for contributors

- Job listing UI has demo-data fallback on API failure or an empty response; demo IDs are not persisted jobs.
- The job-detail apply form collects a resume URL and cover letter; actual file upload remains future work.
- Google login is a placeholder.
- Candidate dashboard saved-job and resume summary numbers are placeholders.
- Production CORS origins are configured through `CORS_ORIGIN`; development defaults to the local Vite origin.
- `render.yaml` configures the backend only. The frontend deployment and production API URL must be configured separately.

Keep documentation aligned with runtime behavior. When a placeholder becomes functional, update both this guide and `README.md`.
