# Engineering rules

- Next.js App Router only.
- TypeScript strict.
- PostgreSQL/Supabase is the source of truth.
- Every user-owned table must have RLS.
- External APIs are connectors, not primary databases.
- Every AI-generated QCM question must preserve source document, page and excerpt.
- Reading progress is based on unique pages viewed, not highest page.
- Never expose provider tokens to client components.
- Keep feature modules independent and testable.
