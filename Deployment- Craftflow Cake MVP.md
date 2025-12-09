

This document explains how to run the app locally and deploy it using:

- Git (GitHub)
- Vercel (production + preview deployments)
- Postgres (for Prisma)

---

## 1. Local setup

### 1.1 Prerequisites

- Node.js (LTS)
- npm or pnpm
- Postgres database (local or hosted, e.g., Supabase/Neon)

### 1.2 Environment variables

Create a `.env` file in the project root with at least:

```

DATABASE_URL=postgres://USER:PASSWORD@HOST:PORT/DB_NAME

```

Adjust the connection string for your Postgres instance.

If auth or other features need secrets later, add them here as well.

### 1.3 Install dependencies and migrate

From the project root:

```

npm install
npx prisma migrate dev
npx prisma db seed
npm run dev

```

- `npx prisma migrate dev` applies schema changes to your local DB.
- `npx prisma db seed` inserts demo ingredients, recipes, tiers, decorations, and settings.
- `npm run dev` runs the app at `http://localhost:3000`.

---

## 2. GitHub setup

1. Initialize Git if not already:

```

git init
git add .
git commit -m "Initial CraftFlow cake MVP"

```

2. Create a new GitHub repo (via UI or CLI).
3. Add the GitHub remote and push:

```

git remote add origin <your-github-repo-url>
git push -u origin main

```

---

## 3. Vercel deployment

These steps assume you already have a Vercel account.

### 3.1 Import the repo into Vercel

1. Go to Vercel dashboard.
2. Click **“New Project”** → **“Import Git Repository”**.
3. Select your GitHub repo.
4. Vercel will detect Next.js automatically.

### 3.2 Configure environment variables

In the Vercel project:

1. Go to **Settings → Environment Variables**.
2. Add:

- `DATABASE_URL` → point this at a **production** Postgres instance (not your local DB).

If you use different DBs per environment, set:

- `DATABASE_URL` for:
  - Production
  - Preview (optional but recommended)
  - Development (optional)

Make sure Prisma’s `schema.prisma` is configured to use `DATABASE_URL`.

### 3.3 First deployment

When you click **Deploy**, Vercel will:

- Install dependencies
- Build the Next.js app
- Run it in their environment

If you have `prisma migrate` or `db seed` steps in `package.json` scripts, call them manually against your production DB after the first deploy, for example from your local machine:

```


# Using the same DATABASE_URL as production

DATABASE_URL=postgres://... npx prisma migrate deploy
DATABASE_URL=postgres://... npx prisma db seed

```

(Adjust to your workflow: you may prefer running migrations from CI in future.)

---

## 4. Preview (staging) deployments

Vercel automatically creates **Preview deployments** for:

- Pull Requests
- Branches other than the production branch (usually `main`)

Workflow:

1. Create a new branch locally, e.g.:

```

git checkout -b feature/new-pricing-ui

```

2. Make changes and push:

```

git push -u origin feature/new-pricing-ui

```

3. Vercel will create a **Preview URL** for that branch/PR.
   - You can open this URL to see the “staging” version of the app with your changes.
   - Each new push to the branch updates the preview.

You can use this to:

- Share work-in-progress with collaborators.
- Test changes before merging to `main`.

---

## 5. Production updates

- When you merge to `main`, Vercel will trigger a **Production deployment** using the production environment variables.
- Use `main` as your stable branch.
- Keep feature development on separate branches that generate preview URLs.

---

## 6. Notes & future improvements

Later you can:

- Add a dedicated `STAGING` Postgres DB and set `DATABASE_URL` separately for Preview vs Production.
- Add a migration/seed pipeline (GitHub Actions or Vercel cron/CI) so schema updates run automatically.
- Integrate logging and error monitoring once the app is used by real bakeries.


