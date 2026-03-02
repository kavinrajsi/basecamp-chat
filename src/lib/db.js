import { neon } from "@neondatabase/serverless";

export const sql = neon(process.env.DATABASE_URL);

let initialized = false;

export async function initDb() {
  if (initialized) return;

  await sql`
    CREATE TABLE IF NOT EXISTS projects (
      id          BIGINT PRIMARY KEY,
      account_id  BIGINT NOT NULL,
      name        TEXT NOT NULL,
      description TEXT,
      status      TEXT NOT NULL DEFAULT 'active',
      created_at  TIMESTAMPTZ,
      updated_at  TIMESTAMPTZ,
      synced_at   TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS people (
      id          BIGINT PRIMARY KEY,
      account_id  BIGINT NOT NULL,
      name        TEXT NOT NULL,
      email       TEXT,
      avatar_url  TEXT,
      title       TEXT,
      synced_at   TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  initialized = true;
}

export async function upsertProjects(projects, accountId) {
  await initDb();
  await Promise.all(
    projects.map((p) =>
      sql`
        INSERT INTO projects (id, account_id, name, description, status, created_at, updated_at, synced_at)
        VALUES (${p.id}, ${accountId}, ${p.name}, ${p.description ?? null}, ${p.status}, ${p.created_at ?? null}, ${p.updated_at ?? null}, NOW())
        ON CONFLICT (id) DO UPDATE SET
          name        = EXCLUDED.name,
          description = EXCLUDED.description,
          status      = EXCLUDED.status,
          updated_at  = EXCLUDED.updated_at,
          synced_at   = NOW()
      `
    )
  );
}

export async function upsertPeople(people, accountId) {
  await initDb();
  await Promise.all(
    people.map((p) =>
      sql`
        INSERT INTO people (id, account_id, name, email, avatar_url, title, synced_at)
        VALUES (${p.id}, ${accountId}, ${p.name}, ${p.email ?? null}, ${p.avatar_url ?? null}, ${p.title ?? null}, NOW())
        ON CONFLICT (id) DO UPDATE SET
          name       = EXCLUDED.name,
          email      = EXCLUDED.email,
          avatar_url = EXCLUDED.avatar_url,
          title      = EXCLUDED.title,
          synced_at  = NOW()
      `
    )
  );
}

export async function getCachedPeople(accountId) {
  await initDb();
  return sql`SELECT * FROM people WHERE account_id = ${accountId} ORDER BY name ASC`;
}

export async function getCachedProjects(accountId) {
  await initDb();
  return sql`SELECT * FROM projects WHERE account_id = ${accountId} ORDER BY updated_at DESC NULLS LAST`;
}

