import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getQuestion, getQuestionAnswers } from "@/lib/basecamp";
import { upsertLeaveAnswers, getCachedLeaveAnswers } from "@/lib/db";

const BUCKET_ID = 1710547;
const QUESTION_ID = 2113472792;

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

export async function GET() {
  const session = getSession();

  if (!session?.accessToken || !session?.accountId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { accessToken, accountId } = session;

  try {
    const [question, answers] = await Promise.all([
      withRetry(() => getQuestion(accessToken, accountId, BUCKET_ID, QUESTION_ID)),
      withRetry(() => getQuestionAnswers(accessToken, accountId, BUCKET_ID, QUESTION_ID)),
    ]);

    // Cache answers to DB in background
    upsertLeaveAnswers(answers, accountId, QUESTION_ID).catch((err) =>
      console.error("DB upsert leave answers failed:", err.message)
    );

    return NextResponse.json({ question, answers });
  } catch (error) {
    console.error("Failed to fetch leave data:", error?.response?.data || error.message);

    if (error?.response?.status === 401) {
      return NextResponse.json({ error: "Token expired" }, { status: 401 });
    }

    // Fall back to DB cache
    try {
      const cached = await getCachedLeaveAnswers(accountId, QUESTION_ID);
      if (cached.length > 0) {
        console.log("Serving leave answers from DB cache");
        // Reshape cached rows to match Basecamp API shape
        const answers = cached.map((row) => ({
          id: row.id,
          content: row.content,
          created_at: row.created_at,
          updated_at: row.updated_at,
          creator: {
            id: row.creator_id,
            name: row.creator_name,
            avatar_url: row.creator_avatar,
          },
        }));
        return NextResponse.json({ question: null, answers });
      }
    } catch (dbErr) {
      console.error("DB fallback failed:", dbErr.message);
    }

    return NextResponse.json({ error: "Failed to fetch leave data" }, { status: 500 });
  }
}
