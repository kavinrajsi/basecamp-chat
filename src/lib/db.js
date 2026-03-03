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
      leave_dates     TEXT,
      wfh_dates       TEXT,
      created_at      TIMESTAMPTZ,
      updated_at      TIMESTAMPTZ,
      synced_at       TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    DO $$ BEGIN
      ALTER TABLE leave_answers ADD COLUMN IF NOT EXISTS leave_dates TEXT;
      ALTER TABLE leave_answers ADD COLUMN IF NOT EXISTS wfh_dates TEXT;
    EXCEPTION WHEN duplicate_column THEN NULL;
    END $$
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS todo_cache (
      account_id  BIGINT PRIMARY KEY,
      data        JSONB NOT NULL,
      synced_at   TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS users_cache (
      account_id  BIGINT PRIMARY KEY,
      data        JSONB NOT NULL,
      synced_at   TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS project_cache (
      account_id  BIGINT NOT NULL,
      project_id  BIGINT NOT NULL,
      data        JSONB NOT NULL,
      synced_at   TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (account_id, project_id)
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS files_cache (
      account_id  BIGINT PRIMARY KEY,
      data        JSONB NOT NULL,
      synced_at   TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS webhook_events (
      id          SERIAL PRIMARY KEY,
      kind        TEXT NOT NULL,
      recording   JSONB,
      creator     JSONB,
      payload     JSONB NOT NULL,
      received_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS leave (
      id              SERIAL PRIMARY KEY,
      recording_id    BIGINT UNIQUE,
      creator_name    TEXT,
      creator_avatar  TEXT,
      creator_email   TEXT,
      ai_response     TEXT,
      raw_content     TEXT,
      created_at      TIMESTAMPTZ DEFAULT NOW(),
      updated_at      TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    DO $$ BEGIN
      ALTER TABLE leave ADD COLUMN IF NOT EXISTS recording_id BIGINT UNIQUE;
      ALTER TABLE leave ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
    EXCEPTION WHEN duplicate_column THEN NULL;
    END $$
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

export async function upsertLeaveAnswers(answers, accountId, questionId) {
  await initDb();
  const CHUNK = 10;
  for (let i = 0; i < answers.length; i += CHUNK) {
    const chunk = answers.slice(i, i + CHUNK);
    await Promise.all(
      chunk.map((a) =>
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
}

export async function updateLeaveAnswerDates(id, leaveDates, wfhDates) {
  await initDb();
  await sql`
    UPDATE leave_answers
    SET leave_dates = ${leaveDates}, wfh_dates = ${wfhDates}
    WHERE id = ${id}
  `;
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

export async function upsertTodoCache(accountId, data) {
  await initDb();
  await sql`
    INSERT INTO todo_cache (account_id, data, synced_at)
    VALUES (${accountId}, ${JSON.stringify(data)}, NOW())
    ON CONFLICT (account_id) DO UPDATE SET
      data      = EXCLUDED.data,
      synced_at = NOW()
  `;
}

export async function getCachedTodoData(accountId) {
  await initDb();
  const rows = await sql`SELECT data, synced_at FROM todo_cache WHERE account_id = ${accountId}`;
  return rows[0] ?? null;
}

export async function getCachedProjects(accountId) {
  await initDb();
  return sql`SELECT * FROM projects WHERE account_id = ${accountId} ORDER BY updated_at DESC NULLS LAST`;
}

export async function upsertUsersCache(accountId, data) {
  await initDb();
  await sql`
    INSERT INTO users_cache (account_id, data, synced_at)
    VALUES (${accountId}, ${JSON.stringify(data)}, NOW())
    ON CONFLICT (account_id) DO UPDATE SET
      data      = EXCLUDED.data,
      synced_at = NOW()
  `;
}

export async function getCachedUsersData(accountId) {
  await initDb();
  const rows = await sql`SELECT data, synced_at FROM users_cache WHERE account_id = ${accountId}`;
  return rows[0] ?? null;
}

export async function upsertProjectCache(accountId, projectId, data) {
  await initDb();
  await sql`
    INSERT INTO project_cache (account_id, project_id, data, synced_at)
    VALUES (${accountId}, ${projectId}, ${JSON.stringify(data)}, NOW())
    ON CONFLICT (account_id, project_id) DO UPDATE SET
      data      = EXCLUDED.data,
      synced_at = NOW()
  `;
}

export async function getCachedProjectData(accountId, projectId) {
  await initDb();
  const rows = await sql`SELECT data, synced_at FROM project_cache WHERE account_id = ${accountId} AND project_id = ${projectId}`;
  return rows[0] ?? null;
}

export async function invalidateProjectCache(accountId, projectId) {
  await initDb();
  await sql`DELETE FROM project_cache WHERE account_id = ${accountId} AND project_id = ${projectId}`;
}

export async function upsertFilesCache(accountId, data) {
  await initDb();
  await sql`
    INSERT INTO files_cache (account_id, data, synced_at)
    VALUES (${accountId}, ${JSON.stringify(data)}, NOW())
    ON CONFLICT (account_id) DO UPDATE SET
      data      = EXCLUDED.data,
      synced_at = NOW()
  `;
}

export async function getCachedFilesData(accountId) {
  await initDb();
  const rows = await sql`SELECT data, synced_at FROM files_cache WHERE account_id = ${accountId}`;
  return rows[0] ?? null;
}

export async function insertWebhookEvent(kind, recording, creator, payload) {
  await initDb();
  await sql`
    INSERT INTO webhook_events (kind, recording, creator, payload)
    VALUES (${kind}, ${JSON.stringify(recording)}, ${JSON.stringify(creator)}, ${JSON.stringify(payload)})
  `;
}

export async function getWebhookEvents(limit = 200) {
  await initDb();
  return sql`SELECT * FROM webhook_events ORDER BY received_at DESC LIMIT ${limit}`;
}

export async function upsertLeave(recordingId, creatorName, creatorAvatar, creatorEmail, aiResponse, rawContent) {
  await initDb();
  await sql`
    INSERT INTO leave (recording_id, creator_name, creator_avatar, creator_email, ai_response, raw_content)
    VALUES (${recordingId}, ${creatorName}, ${creatorAvatar}, ${creatorEmail}, ${aiResponse}, ${rawContent})
    ON CONFLICT (recording_id) DO UPDATE SET
      creator_name   = EXCLUDED.creator_name,
      creator_avatar = EXCLUDED.creator_avatar,
      creator_email  = EXCLUDED.creator_email,
      ai_response    = EXCLUDED.ai_response,
      raw_content    = EXCLUDED.raw_content,
      updated_at     = NOW()
  `;
}

export async function deleteLeaveByRecordingId(recordingId) {
  await initDb();
  await sql`DELETE FROM leave WHERE recording_id = ${recordingId}`;
}

export async function updateLeaveContent(recordingId, rawContent) {
  await initDb();
  await sql`
    UPDATE leave
    SET raw_content = ${rawContent}, ai_response = NULL, updated_at = NOW()
    WHERE recording_id = ${recordingId}
  `;
}

export async function getLeaveByRecordingId(recordingId) {
  await initDb();
  const rows = await sql`SELECT * FROM leave WHERE recording_id = ${recordingId}`;
  return rows[0] ?? null;
}

export async function getLeaveEntries(limit = 200) {
  await initDb();
  return sql`SELECT * FROM leave ORDER BY created_at DESC LIMIT ${limit}`;
}

