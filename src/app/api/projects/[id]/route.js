import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getProject, getPeople } from "@/lib/basecamp";

export async function GET(request, { params }) {
  const session = getSession();

  if (!session?.accessToken || !session?.accountId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [project, people] = await Promise.all([
      getProject(session.accessToken, session.accountId, params.id),
      getPeople(session.accessToken, session.accountId, params.id).catch(
        () => []
      ),
    ]);

    return NextResponse.json({ ...project, people });
  } catch (error) {
    console.error("Failed to fetch project:", error?.response?.data || error.message);
    if (error?.response?.status === 401) {
      return NextResponse.json({ error: "Token expired" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to fetch project" },
      { status: 500 }
    );
  }
}
