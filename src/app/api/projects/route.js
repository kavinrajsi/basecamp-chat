import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getProjects } from "@/lib/basecamp";

export async function GET() {
  const session = getSession();

  if (!session?.accessToken || !session?.accountId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const projects = await getProjects(session.accessToken, session.accountId);
    return NextResponse.json(projects);
  } catch (error) {
    console.error("Failed to fetch projects:", error?.response?.data || error.message);
    if (error?.response?.status === 401) {
      return NextResponse.json({ error: "Token expired" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 }
    );
  }
}
