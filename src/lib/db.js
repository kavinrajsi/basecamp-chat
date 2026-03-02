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

  await sql`
    CREATE TABLE IF NOT EXISTS leave_answers (
      id              BIGINT PRIMARY KEY,
      account_id      BIGINT NOT NULL,
      question_id     BIGINT NOT NULL,
      creator_id      BIGINT,
      creator_name    TEXT,
      creator_avatar  TEXT,
      content         TEXT,
      created_at      TIMESTAMPTZ,
      updated_at      TIMESTAMPTZ,
      synced_at       TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  // One-time migrations
  await sql`DROP TABLE IF EXISTS todos`;

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

export async function upsertLeaveAnswers(answers, accountId, questionId) {
  await initDb();
  await Promise.all(
    answers.map((a) =>
      sql`
        INSERT INTO leave_answers (id, account_id, question_id, creator_id, creator_name, creator_avatar, content, created_at, updated_at, synced_at)
        VALUES (${a.id}, ${accountId}, ${questionId}, ${a.creator?.id ?? null}, ${a.creator?.name ?? null}, ${a.creator?.avatar_url ?? null}, ${a.content ?? null}, ${a.created_at ?? null}, ${a.updated_at ?? null}, NOW())
        ON CONFLICT (id) DO UPDATE SET
          content        = EXCLUDED.content,
          creator_name   = EXCLUDED.creator_name,
          creator_avatar = EXCLUDED.creator_avatar,
          updated_at     = EXCLUDED.updated_at,
          synced_at      = NOW()
      `
    )
  );
}

export async function getCachedLeaveAnswers(accountId, questionId) {
  await initDb();
  return sql`
    SELECT * FROM leave_answers
    WHERE account_id = ${accountId} AND question_id = ${questionId}
    ORDER BY created_at DESC
  `;
}

export async function getCachedPeople(accountId) {
  await initDb();
  return sql`SELECT * FROM people WHERE account_id = ${accountId} ORDER BY name ASC`;
}

export async function getCachedProjects(accountId) {
  await initDb();
  return sql`SELECT * FROM projects WHERE account_id = ${accountId} ORDER BY updated_at DESC NULLS LAST`;
}

