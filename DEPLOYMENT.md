# CraftFlow Deployment Guide

This document explains how to run the app locally and deploy it using:
- Git (GitHub)
- Vercel (production + preview deployments)
- Postgres (for Prisma)

## 1. Local Setup

### 1.1 Prerequisites

- Node.js 18+ (LTS)
- npm or pnpm
- Postgres database (local or hosted, e.g., Supabase, Neon, or Vercel Postgres)

### 1.2 Environment Variables

Create a `.env` file in the project root with:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DB_NAME?schema=public"
```

Replace the connection string with your actual Postgres instance details.

For local development with Docker:
```bash
# Run Postgres locally
docker run --name craftflow-db -e POSTGRES_PASSWORD=password -e POSTGRES_DB=craftflow_dev -p 5432:5432 -d postgres:15
# Then use: DATABASE_URL="postgresql://postgres:password@localhost:5432/craftflow_dev?schema=public"
```

### 1.3 Install Dependencies and Migrate

From the project root, run these commands:

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev --name init

# Seed the database with initial data
npx prisma db seed

# Start the development server
npm run dev
```

The app will be available at `http://localhost:3000`.

### 1.4 Accessing the Application

- **Dashboard**: `http://localhost:3000` - View all cake orders
- **New Order**: `http://localhost:3000/orders/new` - Create a new cake order
- **Admin Panel**:
  - Ingredients: `http://localhost:3000/admin/ingredients`
  - Recipes: `http://localhost:3000/admin/recipes`
  - Tier Sizes: `http://localhost:3000/admin/tiers`
  - Decorations: `http://localhost:3000/admin/decorations`
  - Settings: `http://localhost:3000/admin/settings`

## 2. GitHub Setup

### 2.1 Initialize Git Repository

```bash
git init
git add .
git commit -m "Initial CraftFlow cake MVP"
```

### 2.2 Create GitHub Repository

1. Go to [GitHub](https://github.com) and create a new repository
2. Name it `craftflow` (or your preferred name)
3. Keep it public or private based on your preference
4. Don't initialize with README (we already have files)

### 2.3 Push to GitHub

```bash
git remote add origin https://github.com/YOUR-USERNAME/craftflow.git
git branch -M main
git push -u origin main
```

## 3. Vercel Deployment

### 3.1 Prerequisites

- Vercel account (free tier works)
- GitHub repository created and pushed

### 3.2 Import Project to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New..."** → **"Project"**
3. Click **"Import Git Repository"**
4. Select your `craftflow` repository
5. Vercel will auto-detect Next.js

### 3.3 Configure Environment Variables

In the Vercel project settings:

1. Go to **Settings** → **Environment Variables**
2. Add `DATABASE_URL`:
   - Key: `DATABASE_URL`
   - Value: Your production Postgres connection string
   - Environment: Production, Preview, Development (as needed)

**Recommended Database Providers:**
- **Vercel Postgres**: Integrated with Vercel, easy setup
- **Supabase**: Free tier available, good for starting
- **Neon**: Serverless Postgres, generous free tier

Example for Vercel Postgres:
1. In Vercel Dashboard, go to Storage tab
2. Create a new Postgres database
3. It will automatically add `DATABASE_URL` to your project

### 3.4 Deploy

1. Click **"Deploy"** in Vercel
2. Vercel will build and deploy your application
3. Once deployed, run migrations on production database:

```bash
# From your local machine, using production DATABASE_URL
DATABASE_URL="your-production-db-url" npx prisma migrate deploy
DATABASE_URL="your-production-db-url" npx prisma db seed
```

Alternatively, you can add a build command in `package.json`:
```json
"scripts": {
  "build": "prisma generate && prisma migrate deploy && next build",
  "vercel-build": "prisma generate && prisma migrate deploy && next build"
}
```

## 4. Preview Deployments

Vercel automatically creates preview deployments for:
- Pull requests
- Branches other than `main`

### 4.1 Workflow

1. Create a feature branch:
```bash
git checkout -b feature/new-pricing-ui
```

2. Make changes and push:
```bash
git add .
git commit -m "Add new pricing UI"
git push -u origin feature/new-pricing-ui
```

3. Vercel creates a preview URL automatically
4. Each push updates the preview
5. Use preview URLs to test before merging

### 4.2 Database Strategy for Preview

**Option 1: Shared staging database**
- Use same `DATABASE_URL` for all preview deployments
- Simple but changes affect all previews

**Option 2: Branch-specific databases**
- Create separate database for important branches
- Add branch-specific env vars in Vercel

## 5. Production Updates

1. Merge to `main` branch:
```bash
git checkout main
git merge feature/new-pricing-ui
git push origin main
```

2. Vercel automatically deploys to production
3. Monitor deployment in Vercel dashboard

## 6. Database Migrations in Production

When schema changes are needed:

1. Test locally first:
```bash
npx prisma migrate dev
```

2. Create migration file:
```bash
npx prisma migrate dev --name describe_your_change
```

3. Commit migration files:
```bash
git add prisma/migrations
git commit -m "Add migration: describe your change"
git push
```

4. After deployment, migrations run automatically if using `vercel-build` script

## 7. Monitoring and Logs

- **Vercel Dashboard**: View deployments, logs, and analytics
- **Function Logs**: Check API route performance
- **Database Monitoring**: Use your database provider's dashboard

## 8. Troubleshooting

### Common Issues:

**Build fails with Prisma error:**
- Ensure `prisma generate` runs in build step
- Check `DATABASE_URL` is set correctly

**Database connection fails:**
- Verify connection string format
- Check SSL requirements (add `?sslmode=require` if needed)
- Ensure database allows connections from Vercel IPs

**Migrations not running:**
- Run manually: `DATABASE_URL="..." npx prisma migrate deploy`
- Or add to build script as shown above

## 9. Security Recommendations

1. **Never commit `.env` files**
2. **Use different database passwords for each environment**
3. **Enable SSL for database connections**
4. **Regularly update dependencies**: `npm audit fix`
5. **Set up database backups**

## 10. Next Steps

- Set up custom domain in Vercel
- Configure analytics (Vercel Analytics or Google Analytics)
- Implement proper authentication (NextAuth.js)
- Add error tracking (Sentry)
- Set up automated testing (GitHub Actions)