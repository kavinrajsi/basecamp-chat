import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getProjects } from "@/lib/basecamp";
import { upsertProjects, getCachedProjects } from "@/lib/db";

export async function GET() {
  const session = getSession();

  if (!session?.accessToken || !session?.accountId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accountId = session.accountId;

  try {
    const projects = await getProjects(session.accessToken, accountId);

    // Cache to Neon in the background (don't block the response)
    upsertProjects(projects, accountId).catch((err) =>
      console.error("Neon upsert failed:", err.message)
    );

    return NextResponse.json(projects);
  } catch (error) {
    console.error("Failed to fetch projects:", error?.response?.data || error.message);

    if (error?.response?.status === 401) {
      return NextResponse.json({ error: "Token expired" }, { status: 401 });
    }

    // Fall back to Neon cache
    try {
      const cached = await getCachedProjects(accountId);
      if (cached.length > 0) {
        console.log("Serving projects from Neon cache");
        return NextResponse.json(cached);
      }
    } catch (dbErr) {
      console.error("Neon fallback failed:", dbErr.message);
    }

    return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 });
  }
}
