import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getProjects, getProject, getVaultUploads } from "@/lib/basecamp";
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
  const session = getSession();

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

      const vaultDock = fullProject.dock?.find(
        (d) => d.name === "vault" && d.enabled
      );
      if (!vaultDock) return [];

      const vaultId =
        vaultDock.url?.match(/vaults\/(\d+)/)?.[1] || vaultDock.id;
      if (!vaultId) return [];

      const uploads = await withRetry(() =>
        getVaultUploads(accessToken, accountId, project.id, vaultId)
      ).catch(() => []);

      return uploads.map((u) => ({
        id: u.id,
        filename: u.filename || u.title || "Untitled",
        byte_size: u.byte_size || 0,
        content_type: u.content_type || "unknown",
        created_at: u.created_at,
        app_url: u.app_url,
        download_url: u.download_url || null,
        project_name: project.name,
        creator: u.creator?.name || "Unknown",
      }));
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
