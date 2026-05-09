This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Supabase CLI and Docker

Normal dashboard work (`npm run dev`, `npm run build`) does **not** require Docker.

Scripts in `package.json`:

| Script | What it does | Docker |
| --- | --- | --- |
| `npm run db:types` | Regenerates [`supabase/types.ts`](supabase/types.ts) from the **linked** hosted project (`supabase gen types typescript --linked`). | Usually **not** needed |
| `npm run db:pull` | Pulls remote schema into migrations; the CLI uses a **local shadow Postgres** to diff (`Creating shadow database…`). | **Required** (typical setup on Windows) |
| `npm run db:sync` | Runs `db:pull` then `db:types`. | **Required** for the pull step |

**Linked workflow:** use `db:types` whenever you only need TypeScript types after a schema change. Run `db:pull` when you need migration files synced from remote; that path expects Docker for the shadow database.

**Small disk:** prefer `npm run db:types` alone instead of full `db:sync` when you do not need new migration SQL.

**Why Docker showed gigabytes for this folder:** `supabase db pull` (and `supabase start`) downloads **container images** (Postgres, Storage API, Edge Runtime, etc.). That is **not** the size of your hosted Supabase data—it is local Docker layers, often several GB total.

**Reclaim space after pulls:**

1. Remove unused images (safe when nothing important is running):  
   `docker system prune -a -f`
2. **Docker Desktop may still report ~many GB** on Windows because the WSL2 virtual disk (`.vhdx`) does not always shrink when images are deleted. Use Docker Desktop **Settings → Resources → scroll to disk / “Clean up” / reclaim** (wording varies by version), or see [Docker Desktop WSL 2 disk space](https://docs.docker.com/desktop/settings/windows/#wsl-2-backend).

If you uninstall Docker, `db:pull` / `db:sync` will fail until Docker is available again or you run those commands elsewhere.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
