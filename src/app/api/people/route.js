import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getAllPeople } from "@/lib/basecamp";
import { upsertPeople, getCachedPeople } from "@/lib/db";

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

export async function GET(request) {
  const session = getSession();

  if (!session?.accessToken || !session?.accountId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { accessToken, accountId } = session;
  const fresh = new URL(request.url).searchParams.get("fresh") === "1";

  // Serve from DB cache first for fast load (unless fresh is requested)
  if (!fresh) {
    try {
      const cached = await getCachedPeople(accountId);
      if (cached.length > 0) {
        return NextResponse.json(cached);
      }
    } catch (dbErr) {
      console.error("DB cache read failed:", dbErr.message);
    }
  }

  // No cache or fresh requested — fetch from Basecamp API
  try {
    const raw = await withRetry(() => getAllPeople(accessToken, accountId));

    const people = raw
      .map((p) => ({
        id: p.id,
        name: p.name,
        email: p.email_address,
        avatar_url: p.avatar_url,
        title: p.title || "",
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    // Cache to DB in the background
    upsertPeople(people, accountId).catch((err) =>
      console.error("DB upsert people failed:", err.message)
    );

    return NextResponse.json(people);
  } catch (error) {
    console.error("Failed to fetch people:", error?.response?.data || error.message);

    if (error?.response?.status === 401) {
      return NextResponse.json({ error: "Token expired" }, { status: 401 });
    }

    return NextResponse.json({ error: "Failed to fetch people" }, { status: 500 });
  }
}
