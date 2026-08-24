# Aether Study Timer

A stopwatch-based study timer web app with Pomodoro support and analytics. Track your progress with charts and heatmaps, and use themes and music to stay focused.

## Tech stack

- **Frontend:** Next.js, React, Tailwind CSS, shadcn/ui
- **Backend:** Firebase (Authentication, Realtime Database, optional Cloud Functions)
- **Hosting:** GitHub Pages for the static frontend, Firebase Hosting optional

## Prerequisites

- **Node.js** 18+ (22 for Cloud Functions)
- **pnpm** (or npm / yarn)
- **Firebase CLI:** `npm install -g firebase-tools`
- A [Firebase project](https://console.firebase.google.com/) with Authentication and Realtime Database enabled

## Environment variables

Create a `.env.local` in the project root with your Firebase config (from Firebase Console → Project settings → General → Your apps):

```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_BASE_PATH=
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_DATABASE_URL=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

## Run locally

```bash
# Install dependencies
pnpm install

# Start development server (http://localhost:3000)
pnpm dev
```

## Build & production

> **Note for Windows users**: Use `npm` for building due to a known pnpm build hang issue on Windows.

```bash
# Build for production (use npm on Windows)
npm run build

# Or with pnpm (may hang on Windows)
pnpm build

# Run production build locally
npm start
# or
pnpm start
```

## Lint

```bash
npm run lint
# or
pnpm lint
```

## Test

- **App:** No test script is configured yet. You can add a test runner (e.g. Jest, Vitest) and wire it to `package.json` scripts.
- **Cloud Functions:** From the `functions` folder:
  ```bash
  cd functions
  npm install
  npm run lint
  ```
  Use `firebase-functions-test` for unit tests if you add them.

## Firebase emulators (optional)

Run Auth, Database, Hosting, and the Emulator UI locally:

```bash
firebase emulators:start
```

- Hosting preview: http://localhost:5000
- Emulator UI: http://localhost:4000 (or the port shown in the output)

To run only functions:

```bash
cd functions && npm run serve
```

## Deploy

### Deploy to GitHub Pages

This repo includes `.github/workflows/github-pages.yml`, which builds a static
Next.js export and deploys the `out` folder to GitHub Pages when you push to
`main`.

GitHub Pages only hosts the frontend. Firebase Authentication and Realtime
Database stay in your existing Firebase project and continue to hold your data.

#### One-time GitHub setup

1. Push this repository to GitHub.
2. In GitHub, open **Settings -> Pages**.
3. Set **Build and deployment -> Source** to **GitHub Actions**.
4. In **Settings -> Secrets and variables -> Actions -> Variables**, add:

```text
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_DATABASE_URL
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
```

Use the same values from your local `.env.local`.

The workflow automatically sets:

```text
GITHUB_PAGES=true
NEXT_PUBLIC_BASE_PATH=/<repository-name>
NEXT_PUBLIC_SITE_URL=https://<github-username>.github.io/<repository-name>
```

#### One-time Firebase setup

In Firebase Console, open **Authentication -> Settings -> Authorized domains**
and add your GitHub Pages host:

```text
<github-username>.github.io
```

Do not include `https://` or the repository path in this Firebase field.

After the workflow finishes, your app will be available at:

```text
https://<github-username>.github.io/<repository-name>/
```

### One-time setup

1. Log in: `firebase login`
2. Select project: `firebase use aether-study-timer` (or your project ID)
3. Ensure `.env.local` (or CI secrets) has the same Firebase env vars for build-time.

### Deploy to Firebase

Deploy hosting (Next.js app) and optionally functions and database rules:

```bash
# Deploy hosting only (Next.js app)
firebase deploy --only hosting

# Deploy everything (hosting + functions + database rules)
firebase deploy

# Deploy only Cloud Functions
firebase deploy --only functions

# Deploy only database rules
firebase deploy --only database
```

Firebase Hosting is configured with **frameworksBackend**, so the Next.js app is built and served by Firebase (no manual `next build` upload).

### CI/CD (GitHub Actions)

The repo includes a workflow that on **pull requests**:

1. Runs `npm run build`
2. Deploys a preview to Firebase Hosting and comments on the PR

**Required secret:** `FIREBASE_SERVICE_ACCOUNT_AETHER_STUDY_TIMER` (Firebase service account JSON for the project).

## Project structure (overview)

| Path            | Description                    |
|-----------------|--------------------------------|
| `app/`          | Next.js App Router pages       |
| `components/`   | React components & UI (shadcn) |
| `contexts/`     | Auth and other React contexts  |
| `hooks/`        | Custom hooks (e.g. study data) |
| `lib/`          | Firebase, utils, sound         |
| `types/`        | TypeScript types               |
| `functions/`    | Firebase Cloud Functions       |
| `public/`       | Static assets and sounds       |

## License

Private project.
