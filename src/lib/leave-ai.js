import Anthropic from "@anthropic-ai/sdk";
import { upsertLeave } from "@/lib/db";

const client = new Anthropic();

function stripHtml(html) {
  return (html || "").replace(/<[^>]+>/g, "").trim();
}

export async function extractAndStoreLeave(recording, creator) {
  const content = stripHtml(recording.content) || recording.title || recording.subject || "";
  if (!content) return null;

  const postedAt = recording.created_at;
  const posted = postedAt ? new Date(postedAt) : new Date();
  const postedISO = posted.toISOString().split("T")[0];
  const tomorrowFromPosted = new Date(posted);
  tomorrowFromPosted.setDate(tomorrowFromPosted.getDate() + 1);
  const tomorrowISO = tomorrowFromPosted.toISOString().split("T")[0];
  const postedYear = posted.getFullYear();

  const systemPrompt = `You are a date extraction assistant. Extract leave and WFH dates from a message.

CONTEXT:
- Posted on: ${postedISO} (use this to resolve "today", "tomorrow", day names)
- Today: ${postedISO}
- Tomorrow: ${tomorrowISO}
- Default year: ${postedYear}

DATE PARSING:
- "today" → ${postedISO} → convert to DD/MM/YYYY
- "tomorrow" → ${tomorrowISO} → convert to DD/MM/YYYY
- "9th March" → 09/03/${postedYear}
- "04.03.26" → 04/03/2026 (dot-separated, 2-digit year → 20XX)
- "3.3.26" → 03/03/2026
- "4/3/26" → 04/03/2026
- "4 March 2026" → 04/03/2026
- "11 March" → 11/03/${postedYear}
- Day names ("Monday", "Wednesday") → resolve to nearest date from posted date
- Always use leading zeros: 09 not 9, 03 not 3

DATE RANGES:
- "4.3.26 to 6.3.26" → 04/03/2026,05/03/2026,06/03/2026
- "5th & 6th March" → 05/03/${postedYear},06/03/${postedYear}
- "10th &11 March" → 10/03/${postedYear},11/03/${postedYear}
- Connectors: "&", ",", "to", "and", "-" between DATES mean expand all dates
- IMPORTANT: "12:30 to 2:30pm" is a TIME range, NOT a date range — ignore it

CLASSIFICATION:
- leave/sick/unavailable/not available/not feeling well/appointment/personal emergency/not coming → leave
- WFH/work from home/working from home → wfh
- No WFH mention = everything is leave

IGNORE: hashtags (#test), greetings, apologies, explanations

OUTPUT FORMAT (exact):
leave : DD/MM/YYYY,DD/MM/YYYY
wfh: DD/MM/YYYY,DD/MM/YYYY

Rules:
- "leave : " = leave + space + colon + space
- "wfh: " = wfh + colon + space
- Multiple dates separated by comma, NO spaces after commas
- If only leave → output only leave line
- If only wfh → output only wfh line
- If both → leave line first, then wfh line
- Output NOTHING else — no explanation, no extra text, no trailing punctuation

EXAMPLES:

Message: "I'll be on leave on 9th March(Monday) due to hospital visit. Will be unavailable on calls/ messages due to procedures. #test"
leave : 09/03/2026

Message: "Hey team, I won't be available tomorrow (04.03.26) due to some unavaoidable personal emergency. #test" (posted 2026-03-03)
leave : 04/03/2026

Message: "I will not be available from 12:30 to around 2:30pm tomorrow (Wednesday, 4th March) as I have a doctor's appointment then." (posted 2026-03-03)
leave : 04/03/2026

Message: "Hi team I'm taking leave for the day as I'm not feeling well today." (posted 2026-03-03)
leave : 03/03/2026

Message: "Hi team, Due to some personal commitments, I wont be able to come to the office today (3.3.26). I'll be working from home until Friday (4.3.26 to 6.3.26). Apologies for the late notice." (posted 2026-03-03)
leave : 03/03/2026
wfh: 04/03/2026,05/03/2026,06/03/2026

Message: "I'll be on leave on 9th March(Monday) due to hospital visit. Will be unavailable on calls/ messages due to procedures. WFH - 5th & 6th March, 10th &11 March."
leave : 09/03/2026
wfh: 05/03/2026,06/03/2026,10/03/2026,11/03/2026`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 200,
    temperature: 1,
    system: systemPrompt,
    messages: [{ role: "user", content }],
  });

  const result = response.content[0]?.text?.trim() || "No leave date found.";

  // Store in leave table
  await upsertLeave(
    recording.id || null,
    creator?.name || null,
    creator?.avatar_url || null,
    creator?.email_address || null,
    result,
    content,
  );

  return result;
}
