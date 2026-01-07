import { config as dotenvConfig } from "dotenv";
import { defineConfig } from "prisma/config";

// Load env in a Next.js-friendly way:
// - Prefer `.env.local` if present (common for local dev)
// - Fallback to `.env`
dotenvConfig({ path: ".env.local" });
dotenvConfig();

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Use direct connection for migrations/db push (avoids PgBouncer issues)
    url: process.env.DIRECT_URL || process.env.DATABASE_URL!,
  },
});
