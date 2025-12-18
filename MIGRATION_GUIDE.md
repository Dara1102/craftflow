# Database Migration Guide

## What are Migrations?

Migrations are version-controlled database schema changes. They:
- ✅ Track all database changes over time
- ✅ Create SQL files you can review before applying
- ✅ Allow rollbacks if something goes wrong
- ✅ Are safer for production deployments

## Quick Commands

I've added these npm scripts to `package.json` for you:

```bash
# Create a new migration (use this when you change the schema)
npm run db:migrate

# Push schema changes directly (faster for development, but no history)
npm run db:push

# Generate Prisma Client after schema changes
npm run db:generate

# Open Prisma Studio to view/edit data
npm run db:studio
```

## How to Use

### When you change `prisma/schema.prisma`:

1. **Run the migration:**
   ```bash
   npm run db:migrate
   ```
   
2. **Give it a name when prompted:**
   ```
   Enter a name for the new migration: add_packaging_costs
   ```

3. **Review the migration file** (optional):
   - Check `prisma/migrations/[timestamp]_[name]/migration.sql`
   - Make sure the SQL looks correct

4. **That's it!** The migration is applied automatically.

## Current Status

✅ Migration system is set up
✅ Baseline migration created
✅ Database is synced with schema

## Going Forward

- **I'll handle migrations** when I make schema changes
- **You can use** `npm run db:migrate` if you make changes manually
- **All migrations are tracked** in `prisma/migrations/` folder
