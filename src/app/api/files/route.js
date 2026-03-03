import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getProjects, getProject, getVaultUploads, getVaultDocuments, getVaultFolders, getMessageBoardMessages } from "@/lib/basecamp";
import { upsertFilesCache, getCachedFilesData } from "@/lib/db";

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

async function withRetry(fn, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (err?.response?.status === 429 && attempt < retries - 1) {
        const wait = parseInt(err.response.headers?.["retry-after"] || "8", 10);
        await sleep(wait * 1000);
      } else {
        throw err;
      }
    }
  }
}

async function runWithConcurrency(tasks, limit) {
  const results = new Array(tasks.length);
  let index = 0;
  async function worker() {
    while (index < tasks.length) {
      const i = index++;
      results[i] = await tasks[i]();
    }
  }
  await Promise.all(Array.from({ length: limit }, worker));
  return results;
}

export async function GET() {
  const session = await getSession();

  if (!session?.accessToken || !session?.accountId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { accessToken, accountId } = session;

  try {
    // Serve from cache if fresh
    const cached = await getCachedFilesData(accountId).catch(() => null);
    if (cached) {
      const age = Date.now() - new Date(cached.synced_at).getTime();
      if (age < CACHE_TTL_MS) {
        return NextResponse.json(cached.data);
      }
    }

    const projects = await withRetry(() => getProjects(accessToken, accountId));
    const activeProjects = projects.filter((p) => p.status === "active");

    const projectTasks = activeProjects.map((project) => async () => {
      const fullProject = await withRetry(() =>
        getProject(accessToken, accountId, project.id)
      ).catch(() => null);

      if (!fullProject) return [];

      const items = [];

      // Vault dock: uploads, documents, folders
      const vaultDock = fullProject.dock?.find(
        (d) => d.name === "vault" && d.enabled
      );
      if (vaultDock) {
        const vaultId =
          vaultDock.url?.match(/vaults\/(\d+)/)?.[1] || vaultDock.id;
        if (vaultId) {
          const [uploads, documents, folders] = await Promise.all([
            withRetry(() => getVaultUploads(accessToken, accountId, project.id, vaultId)).catch(() => []),
            withRetry(() => getVaultDocuments(accessToken, accountId, project.id, vaultId)).catch(() => []),
            withRetry(() => getVaultFolders(accessToken, accountId, project.id, vaultId)).catch(() => []),
          ]);

          for (const u of uploads) {
            items.push({
              id: u.id,
              type: "upload",
              title: u.filename || u.title || "Untitled",
              filename: u.filename || u.title || "Untitled",
              byte_size: u.byte_size || 0,
              content_type: u.content_type || "unknown",
              created_at: u.created_at,
              app_url: u.app_url,
              download_url: u.download_url || null,
              project_name: project.name,
              creator: u.creator?.name || "Unknown",
            });
          }

          for (const d of documents) {
            items.push({
              id: d.id,
              type: "document",
              title: d.title || "Untitled",
              byte_size: null,
              content_type: "text/html",
              created_at: d.created_at,
              app_url: d.app_url,
              download_url: null,
              project_name: project.name,
              creator: d.creator?.name || "Unknown",
            });
          }

          for (const v of folders) {
            items.push({
              id: v.id,
              type: "vault",
              title: v.title || "Untitled",
              byte_size: null,
              content_type: null,
              documents_count: v.documents_count || 0,
              uploads_count: v.uploads_count || 0,
              vaults_count: v.vaults_count || 0,
              created_at: v.created_at,
              app_url: v.app_url,
              project_name: project.name,
              creator: v.creator?.name || "Unknown",
            });
          }
        }
      }

      // Message board dock: messages → extract attachments
      const messageBoardDock = fullProject.dock?.find(
        (d) => d.name === "message_board" && d.enabled
      );
      if (messageBoardDock) {
        const boardId =
          messageBoardDock.url?.match(/message_boards\/(\d+)/)?.[1] || messageBoardDock.id;
        if (boardId) {
          const messages = await withRetry(() =>
            getMessageBoardMessages(accessToken, accountId, project.id, boardId)
          ).catch(() => []);

          for (const msg of messages) {
            if (!msg.attachments || msg.attachments.length === 0) continue;
            for (const a of msg.attachments) {
              items.push({
                id: a.id,
                type: "attachment",
                title: a.filename || a.title || "Untitled",
                byte_size: a.byte_size || 0,
                content_type: a.content_type || "unknown",
                created_at: a.created_at || msg.created_at,
                app_url: a.app_url || msg.app_url,
                download_url: a.download_url || null,
                project_name: project.name,
                creator: a.creator?.name || msg.creator?.name || "Unknown",
              });
            }
          }
        }
      }

      return items;
    });

    const results = await runWithConcurrency(projectTasks, 3);
    const data = results.flat();

    await upsertFilesCache(accountId, data).catch((e) =>
      console.error("Failed to cache files data:", e.message)
    );

    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to fetch files:", error?.response?.data || error.message);
    if (error?.response?.status === 401) {
      return NextResponse.json({ error: "Token expired" }, { status: 401 });
    }
    // Fall back to stale cache
    const stale = await getCachedFilesData(accountId).catch(() => null);
    if (stale) return NextResponse.json(stale.data);
    return NextResponse.json({ error: "Failed to fetch files" }, { status: 500 });
  }
}
