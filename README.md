# Aether Study Timer

Aether is a stopwatch- and Pomodoro-based study timer with task tracking, themes, focus music, Firebase authentication, persistent study data, and analytics such as charts and heatmaps.

## Tech Stack

- **Frontend:** Next.js, React, TypeScript, Tailwind CSS, shadcn/ui
- **Data/Auth:** Firebase Authentication and Realtime Database
- **Optional backend:** Firebase Cloud Functions
- **Hosting:** GitHub Pages or Firebase Hosting

## Prerequisites

- **Node.js 22** recommended
- **npm**, pnpm, or yarn
- **Firebase CLI** for Firebase deployment/emulators
- a Firebase project with Authentication and Realtime Database enabled

## Environment Variables

Create `.env.local` in the project root:

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

Firebase's browser configuration values are used by the client application. Database access is enforced separately by `database.rules.json`, which scopes each user's data to their authenticated Firebase UID.

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Quality Checks

Run the root unit tests with:

```bash
npm test
```

The tests use Node's built-in test runner and currently cover base-path normalization used by GitHub Pages deployment. The GitHub Pages workflow runs these tests before building and deploying the app.

Firebase Cloud Functions have a separate lint command:

```bash
cd functions
npm install
npm run lint
```

There is intentionally no misleading root `npm run lint` command until a root lint configuration is added.

## Build

```bash
npm run build
npm start
```

The package is named `aether-study-timer`. The `"private": true` field in `package.json` prevents accidental publication to npm; it does **not** mean this GitHub repository is private.

## Firebase Emulators

```bash
firebase emulators:start
```

The emulator suite can provide local Auth, Realtime Database, Hosting, Functions, and Emulator UI services depending on your Firebase configuration.

## GitHub Pages Deployment

`.github/workflows/github-pages.yml` runs on pushes to `main` and:

1. installs dependencies with `npm ci`;
2. runs `npm test`;
3. builds the static Next.js export;
4. uploads and deploys the generated `out/` directory with GitHub Pages.

Add these repository variables under **Settings → Secrets and variables → Actions → Variables**:

```text
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_DATABASE_URL
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
```

The workflow supplies:

```text
GITHUB_PAGES=true
NEXT_PUBLIC_BASE_PATH=/<repository-name>
NEXT_PUBLIC_SITE_URL=https://<github-username>.github.io/<repository-name>
```

For Firebase Authentication, add `<github-username>.github.io` as an authorized domain in Firebase Console.

Generated Firebase deployment output under `.firebase/` is intentionally ignored and should not be committed.

## Firebase Deployment

```bash
firebase login
firebase use aether-study-timer
firebase deploy
```

Useful scoped deployments include:

```bash
firebase deploy --only hosting
firebase deploy --only functions
firebase deploy --only database
```

## Project Structure

| Path | Purpose |
|---|---|
| `app/` | Next.js App Router pages |
| `components/` | UI and feature components |
| `contexts/` | React contexts such as authentication |
| `hooks/` | Study data, timer worker, and preference hooks |
| `lib/` | Firebase configuration and shared utilities |
| `types/` | Shared TypeScript types |
| `functions/` | Firebase Cloud Functions |
| `tests/` | Root unit tests |
| `public/` | Static assets and sounds |

## Repository Hygiene

The repository ignores local secrets, Next.js build output, and Firebase deployment artifacts. Do not commit `.env.local`, Firebase service-account credentials, `.next/`, `out/`, or `.firebase/`.

## License

No open-source license is currently provided. The repository is public for portfolio and demonstration purposes; public visibility should not be interpreted as permission to redistribute or relicense the project.
