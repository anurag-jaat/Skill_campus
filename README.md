# SkillBridge

**A student platform for campus freelancing, skill exchange, and team building**

---

## What It Is

SkillBridge is a student collaboration platform that groups accounts by verified email domain and connects users across three core collaboration modes:

| Mode | How it Works | Type |
| --- | --- | --- |
| **Freelance** | A student posts a task with a budget and deadline. Other students submit bids. Once accepted, work is delivered and reviewed. | Paid Work |
| **Skill Exchange** | A student lists skills they can teach and skills they want to learn. The system matches compatible students for mutual learning. | Peer-to-Peer Learning |
| **Team Finder** | Students assemble teams for hackathons, capstones, and campus competitions by specifying required skills and team sizes. | Team Collaboration |

All modes share **one listings table, one public student profile, and one unified trust & rating system**, keeping the application lightweight and cohesive.

---

## Key Features

- **Typo-Tolerant Smart Search**:
  - Global fuzzy search powered by Damerau-Levenshtein distance and sliding-window token scoring.
  - Automatically matches students, skills, and posts even with typos (e.g., `pyhton` ➔ `Python`, `desgn` ➔ `Design`, `pster` ➔ `Poster`).
  - Scoped to campus access permissions (`college_id`).
  - Search results hub (`/search`) with categorized tabs: **All**, **Students**, and **Posts & Tasks**.
  - In-page live fuzzy filtering on the `/browse` page.

- **Campus Authentication & Security**:
  - Email OTP verification for any valid email domain, with new accounts grouped by their verified college email domain.
  - Custom JWTs with college scoping and roll number verification.
  - Pluggable mail driver (console logger for local dev, SMTP for production).

- **In-App Messaging & Collaboration**:
  - Project/listing chat between posters and accepted workers.
  - Team application and member management for hackathons and projects.

- **Support & Ticketing System**:
  - Students can raise support tickets with proof/screenshot attachments.
  - Two-way live chat between students and campus admins on support tickets.

- **Real-Time Notifications**:
  - Server-Sent Events (SSE) stream live unread notification counts and alerts directly to the navbar.

- **Trust & Reviews**:
  - Star ratings, text reviews, and image proof attachments after gig completion.
  - Campus reporting system with administrative review, warning, and blocking tools.

- **Admin Management Panel**:
  - College domain management, active student directory, listing moderation, report handling, and live support chat desk.

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| **Frontend** | React 18 (Vite), Tailwind CSS, React Router, Server-Sent Events |
| **Backend** | Node.js, Express, Zod validation, JSON Web Tokens (JWT) |
| **Database** | Firebase Cloud Firestore (Firebase Admin SDK, server-side only) |
| **Search Engine** | Custom typo-tolerant Damerau-Levenshtein fuzzy matching engine |
| **Mailing** | Nodemailer (Console driver for dev, SMTP for production) |
| **Deployment** | GitHub Pages (frontend) + Firebase Cloud Functions (API) + Cloud Firestore (data) |

---

## Project Layout

```
SkillBridge/
├── .github/
│   └── workflows/
│       ├── ci.yml                 # Build and mock-data tests
│       └── deploy-pages.yml       # GitHub Pages deployment
├── firebase.json                 # Cloud Functions, Firestore, and emulator config
├── firestore.rules               # Deny direct client access; API uses Admin SDK
├── backend/
│   ├── db/
│   │   ├── schema.sql              # Supabase PostgreSQL schema
│   ├── .env.example
│   ├── src/
│   │   ├── functions.js            # Firebase Cloud Function entry point
│   │   ├── server.js               # Local server entry point
│   │   ├── app.js                  # Express setup, middleware, error handler
│   │   ├── config/env.js           # Centralized environment config
│   │   ├── db/
│   │   │   ├── index.js            # Database driver selector
│   │   │   ├── firestore.js        # Firebase Admin SDK setup
│   │   │   ├── firestoreAdapter.js # Firestore data-access adapter
│   │   │   └── supabase.js         # Optional Supabase adapter
│   │   ├── middleware/             # requireAuth, errorHandler
│   │   ├── services/               # mailer.js, otpService.js
│   │   ├── utils/                  # ApiError, asyncHandler, fuzzySearch.js
│   │   ├── routes/index.js         # Top-level API router
│   │   └── modules/                # Auth, users, listings, teams, support, etc.
│   └── test/                       # Mock Firestore and API integration tests
│       ├── auth.test.js
│       └── firestoreAdapter.test.js
└── frontend/
    ├── .env.example
    └── src/
        ├── App.jsx                 # Routes and application shell
        ├── lib/api.js              # Centralized API client
        ├── context/AuthContext.jsx # Authentication state provider
        ├── utils/fuzzySearch.js    # Client-side typo-tolerant fuzzy matching
        ├── components/             # Navbar, ModeToggle, ListingCard, ProtectedRoute, ImageModal
        └── pages/                  # Home, Browse, CreateListing, Dashboard, Exchanges,
                                    # SearchUsers, ListingDetail, Profile, PublicProfile,
                                    # Support, About, AdminPanel, Login, Register, NotFound
```

---

## Running Locally

Requires **Node.js 22 or newer**.

### 1. Backend Setup

```bash
cd backend
npm install
cp .env.example .env      # Windows PowerShell: Copy-Item .env.example .env
npm run dev
```

Generate a random string for `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

The API runs at <http://localhost:4000>. Health check: <http://localhost:4000/health>.

### 2. Frontend Setup

In a second terminal:

```bash
cd frontend
npm install
cp .env.example .env      # Windows PowerShell: Copy-Item .env.example .env
npm run dev
```

The frontend runs at <http://localhost:5173>.

### 3. Sign In & Terminal OTP

With `MAIL_DRIVER=console` (the default in development), verification codes are printed directly to the **backend terminal**:

```
================================================================
  MAIL (console driver - nothing was actually sent)
================================================================
  To      : student@apollouniversity.edu.in
  Subject : Your SkillBridge verification code: 428193
================================================================
  Your verification code is: 428193
================================================================
```

Enter the code into the verification screen to complete sign in.

Without a production database configuration, local development uses a mock in-memory database seeded with the default college domain. Accounts and app data are lost when the backend restarts; use Firestore or Supabase for persistent data.

Any valid email domain can register. Students must verify their email with an OTP, and new registrations are grouped into a college based on the email domain.

---

## Hosting: GitHub Pages + Firebase

The production layout is:

- **GitHub Pages** hosts the Vite/React frontend as a static site.
- **Firebase Cloud Functions (2nd gen)** hosts the Express API.
- **Cloud Firestore** stores application data. The API uses Firebase Admin credentials; the browser never connects to Firestore directly.
- OTP hashes and attempt counts are stored through the configured database driver so a Firebase function can verify a code on a different instance.
- **Nodemailer SMTP** sends registration and password-reset OTPs. The console mail driver is for local development only.

GitHub Pages cannot run Node/Express or store server-side secrets. Do not deploy the backend or Firestore service-account credentials to Pages. Firebase Functions requires a Firebase project on the **Blaze (pay-as-you-go) plan**; review Firebase quotas and costs before launch.

### 1. Create and configure Firebase

1. Create a Firebase project in the [Firebase Console](https://console.firebase.google.com/).
2. Upgrade the project to Blaze, then create a **Cloud Firestore database** in the region you intend to use. Keep the Functions region and Firestore region close to each other.
3. Install the Firebase CLI (`npm install --global firebase-tools`) and sign in:

   ```powershell
   firebase login
   firebase use --add
   ```

   Choose the project you created. The repository already contains `firebase.json` and locked-down `firestore.rules`; do not replace these files with a new initialization.

4. From the repository root, create an **untracked** `backend/.env.<PROJECT_ID>` file, replacing the project ID in the filename and values:

   ```dotenv
   NODE_ENV=production
   DATABASE_DRIVER=firestore
   FIREBASE_PROJECT_ID=<PROJECT_ID>
   FUNCTION_REGION=us-central1
   CORS_ORIGIN=https://<GITHUB_USERNAME>.github.io
   MAIL_DRIVER=smtp
   MAIL_FROM=SkillBridge <your-verified-sender@example.com>
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   ```

   `CORS_ORIGIN` is the site **origin only** (no repository path). For a custom Pages domain, use that exact `https://` origin. Use an SMTP account and provider-approved sender; Gmail requires an App Password. The `.env.<PROJECT_ID>` file is ignored by Git and must never be committed.

5. Store secrets in Firebase Secret Manager (never in GitHub Pages variables or frontend files):

   ```powershell
   firebase functions:secrets:set JWT_SECRET
   firebase functions:secrets:set SMTP_USER
   firebase functions:secrets:set SMTP_PASS
   ```

   Supply a long random JWT secret when prompted. Set `SMTP_USER` to the SMTP account and `SMTP_PASS` to its app password. Secret values are only bound to the API function.

6. Deploy the Firestore rules and API:

   ```powershell
   firebase deploy --only firestore:rules,functions
   ```

   The API endpoint is printed by Firebase. For the default `us-central1` region it has this form:
   `https://us-central1-<PROJECT_ID>.cloudfunctions.net/skillbridgeApi`.
   The endpoint includes the `skillbridgeApi` function name; the frontend appends API paths such as `/api/auth/login`.

   Check `https://us-central1-<PROJECT_ID>.cloudfunctions.net/skillbridgeApi/health`. It should return JSON with `"status":"ok"` and `"database":"firestore"`. If the function fails to deploy or start, check Firebase logs and ensure the Firestore database exists and the secrets are set.

### 2. Deploy the frontend to GitHub Pages

1. Push this repository to GitHub and use the `main` branch. In **Settings → Secrets and variables → Actions → Variables**, add:
   - `VITE_API_URL` = the full Firebase function endpoint from the previous step, for example `https://us-central1-<PROJECT_ID>.cloudfunctions.net/skillbridgeApi`.
2. In **Settings → Pages**, choose **GitHub Actions** as the build and deployment source.
3. Push to `main` (or manually run **Deploy SkillBridge to GitHub Pages** from the Actions tab). The workflow builds the frontend using the repository’s Pages path, copies the app to `404.html` for React Router deep links, and deploys `frontend/dist`.
4. Open `https://<GITHUB_USERNAME>.github.io/<REPOSITORY_NAME>/`. Confirm the site loads, then try registration, OTP, sign-in, and a protected page. A failed deployment or missing API URL appears in the Actions run logs.

The deployment workflow fails rather than publishing a build if `VITE_API_URL` is not configured. The API URL is public and may be a GitHub Actions variable; **JWT, SMTP, and Firebase credentials must never be frontend variables**.

### 3. Test the Firebase data store locally

Local development uses mock/in-memory storage by default; it resets when the backend restarts. The Firestore adapter has mock-data CRUD/filter tests, which do not need Firebase credentials:

```powershell
cd backend
npm ci
npm test
```

To validate against the Firestore emulator before deploying:

1. In `backend/.env`, set `DATABASE_DRIVER=firestore`, `FIREBASE_PROJECT_ID=demo-skillbridge`, and `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080`.
2. In one terminal at the repository root, run `firebase emulators:start --only firestore --project demo-skillbridge`.
3. In a second terminal, run `cd backend; npm run dev`, then check <http://localhost:4000/health> and exercise registration/login. Use a disposable demo project for emulator tests, not production credentials.

The Admin SDK bypasses Firestore client security rules by design; the API must continue to authenticate and authorize every protected request.
Firestore queries currently use one indexed equality filter and apply any additional equality filters in the API adapter. The existing API also has bounded result limits but not cursor pagination; monitor read usage and add indexed pagination before growing to large datasets.

---

## Environment Variables

### `backend/.env`

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `NODE_ENV` | No | `development` | Environment mode (`development` or `production`) |
| `PORT` | No | `4000` | Port Express listens on |
| `CORS_ORIGIN` | No | `http://localhost:5173` | Allowed frontend origins (comma-separated) |
| `JWT_SECRET` | **Yes** | — | Secret key used to sign JWT authentication tokens |
| `JWT_EXPIRES_IN` | No | `7d` | Token expiration duration |
| `DATABASE_DRIVER` | No | `memory` | `memory` for local mock data, `firestore` for Firebase, or `supabase` for the optional Supabase adapter |
| `FIREBASE_PROJECT_ID` | For Firestore | — | Firebase project ID; set with `DATABASE_DRIVER=firestore` |
| `FIRESTORE_EMULATOR_HOST` | Local emulator | — | Firestore Emulator address, e.g. `127.0.0.1:8080` |
| `FUNCTION_REGION` | No | `us-central1` | Region used by the Firebase HTTPS function |
| `ALLOWED_EMAIL_DOMAIN` | No | `apollouniversity.edu.in` | Default college domain seeded in local in-memory development |
| `COLLEGE_NAME` | No | `Apollo University` | Name for the default college seeded in local in-memory development |
| `OTP_TTL_MINUTES` | No | `10` | Lifetime of one-time login passwords |
| `MAIL_DRIVER` | No | `console` | `console` (terminal output) or `smtp` (real email delivery) |
| `MAIL_FROM` | No | `SkillBridge <no-reply@skillbridge.local>` | Outgoing email sender header |
| `SMTP_HOST` | If `smtp` | `smtp.gmail.com` | SMTP server host |
| `SMTP_PORT` | If `smtp` | `587` | `587` (STARTTLS) or `465` (SSL) |
| `SMTP_SECURE` | If `smtp` | `false` | `false` for port 587, `true` for port 465 |
| `SMTP_USER` | If `smtp` | — | Gmail or SMTP account username |
| `SMTP_PASS` | If `smtp` | — | Gmail App Password (16 characters) |
| `SUPABASE_URL` | If using Supabase | — | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | If using Supabase | — | Supabase `service_role` key (server only) |
| `JWT_SECRET` (Firebase Secret) | Firebase | — | Set with `firebase functions:secrets:set JWT_SECRET`; never commit it |
| `SMTP_USER`, `SMTP_PASS` (Firebase Secrets) | If SMTP | — | SMTP credentials stored in Firebase Secret Manager |

### `frontend/.env`

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `VITE_API_URL` | **Yes in production** | `http://localhost:4000` in local development | Full Firebase function URL (ending in `/skillbridgeApi`) |
| `VITE_COLLEGE_DOMAIN` | No | `apollouniversity.edu.in` | Display hint for the college login screen |
| `VITE_BASE_PATH` | No | `/` | GitHub Pages path; deployment workflow sets this from the repository name |

---

## API Reference

All endpoints are prefixed with `/api`. Protected routes require `Authorization: Bearer <token>`.

### Authentication & Users
| Method | Route | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/api/auth/request-otp` | — | Request a one-time verification code |
| `POST` | `/api/auth/login` | — | Sign in with email and password |
| `POST` | `/api/auth/register` | — | Complete new student registration |
| `GET` | `/api/auth/me` | ✓ | Fetch current authenticated student profile |
| `GET` | `/api/users/search?q=` | — | Typo-tolerant user and skill search |
| `GET` | `/api/users/:id` | — | Public student profile, trust score, and reviews |
| `PATCH` | `/api/users/me` | ✓ | Update bio, skills offered, and skills wanted |
| `PATCH` | `/api/users/me/avatar` | ✓ | Upload/update profile avatar |

### Unified Search
| Method | Route | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/api/search?q=&type=` | — / ✓ | Smart typo-tolerant search across users and listings with campus scoping |

### Listings & Collaboration
| Method | Route | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/api/listings` | — / ✓ | Browse listings filtered by mode (`freelance`, `exchange`, `team`) |
| `GET` | `/api/listings/:id` | — / ✓ | Detailed view of a single listing |
| `POST` | `/api/listings` | ✓ | Create a freelance task, skill swap, or team posting |
| `PATCH` | `/api/listings/:id` | ✓ | Update listing details |
| `PATCH` | `/api/listings/:id/status` | ✓ | Update status (`open`, `in_progress`, `completed`, `cancelled`) |
| `DELETE` | `/api/listings/:id` | ✓ | Delete a listing (owner only) |

### Bids, Exchanges & Teams
| Method | Route | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/api/bids?listing_id=` | ✓ | Retrieve bids on a freelance task |
| `POST` | `/api/bids` | ✓ | Place a bid on a freelance task |
| `POST` | `/api/bids/:id/accept` | ✓ | Accept a bid (listing owner) |
| `GET` | `/api/exchanges/matches` | ✓ | Get matching students for skill swaps |
| `GET` | `/api/exchanges` | ✓ | Get user's skill swap proposals |
| `POST` | `/api/exchanges` | ✓ | Propose a skill exchange |
| `POST` | `/api/exchanges/:id/accept` | ✓ | Accept a proposed skill swap |
| `GET` | `/api/teams?listing_id=` | ✓ | View team applications for a team post |
| `POST` | `/api/teams` | ✓ | Apply to join a team |
| `POST` | `/api/teams/:id/accept` | ✓ | Accept a team member application |
| `POST` | `/api/teams/:id/remove` | ✓ | Remove a member from a team |

### Messages & Support
| Method | Route | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/api/messages/:listing_id` | ✓ | Fetch project messages for a listing |
| `POST` | `/api/messages/:listing_id` | ✓ | Send a message within a listing |
| `POST` | `/api/support/tickets` | ✓ | Submit a new support ticket with optional attachment |
| `GET` | `/api/support/tickets/mine` | ✓ | Retrieve current student's support tickets |
| `GET` | `/api/support/tickets/:id/messages` | ✓ | Get live conversation for a support ticket |
| `POST` | `/api/support/tickets/:id/messages` | ✓ | Send a message on a support ticket |
| `PATCH` | `/api/support/tickets/:id/status` | ✓ | Update ticket status (Admin or owner) |

### Notifications, Reviews & Reports
| Method | Route | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/api/notifications` | ✓ | Fetch user notifications list |
| `GET` | `/api/notifications/stream` | ✓ | Real-time SSE notification stream |
| `PATCH` | `/api/notifications/read` | ✓ | Mark all notifications as read |
| `GET` | `/api/reviews?user_id=` | — | Get verified reviews for a student |
| `POST` | `/api/reviews` | ✓ | Submit a review and rating after gig completion |
| `POST` | `/api/reports` | ✓ | Report a student profile or listing |

---

## Contributing & Git Workflow

```bash
git checkout -b feature/your-feature
# ... make changes ...
git add <specific-files>
git commit -m "Implement feature: description"
git push -u origin feature/your-feature
```

> **Security Note**: Never commit `.env` files or credentials. The root `.gitignore` protects environment files by default.
