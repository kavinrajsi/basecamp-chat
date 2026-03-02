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
    CREATE TABLE IF NOT EXISTS todos (
      id           BIGINT PRIMARY KEY,
      account_id   BIGINT NOT NULL,
      title        TEXT NOT NULL,
      completed    BOOLEAN DEFAULT FALSE,
      due_on       DATE,
      created_at   TIMESTAMPTZ,
      type         TEXT,
      list_name    TEXT,
      project_id   BIGINT,
      project_name TEXT,
      app_url      TEXT,
      synced_at    TIMESTAMPTZ DEFAULT NOW()
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

export async function upsertTodos(todos, accountId) {
  await initDb();
  await Promise.all(
    todos.map((t) =>
      sql`
        INSERT INTO todos (id, account_id, title, completed, due_on, created_at, type, list_name, project_id, project_name, app_url, synced_at)
        VALUES (${t.id}, ${accountId}, ${t.title}, ${t.completed}, ${t.due_on ?? null}, ${t.created_at ?? null}, ${t.type ?? null}, ${t.listName ?? null}, ${t.projectId ?? null}, ${t.projectName ?? null}, ${t.appUrl ?? null}, NOW())
        ON CONFLICT (id) DO UPDATE SET
          title        = EXCLUDED.title,
          completed    = EXCLUDED.completed,
          due_on       = EXCLUDED.due_on,
          list_name    = EXCLUDED.list_name,
          project_id   = EXCLUDED.project_id,
          project_name = EXCLUDED.project_name,
          app_url      = EXCLUDED.app_url,
          synced_at    = NOW()
      `
    )
  );
}

export async function getCachedProjects(accountId) {
  await initDb();
  return sql`SELECT * FROM projects WHERE account_id = ${accountId} ORDER BY updated_at DESC NULLS LAST`;
}

export async function getCachedTodos(accountId) {
  await initDb();
  return sql`SELECT * FROM todos WHERE account_id = ${accountId} ORDER BY due_on ASC NULLS LAST`;
}
