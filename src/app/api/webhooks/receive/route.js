import { insertWebhookEvent, deleteLeaveByRecordingId, updateLeaveContent, upsertLeave } from "@/lib/db";

function stripHtml(html) {
  return (html || "").replace(/<[^>]+>/g, "").trim();
}

export async function POST(request) {
  try {
    const payload = await request.json();
    const { kind, recording, creator } = payload;

    await insertWebhookEvent(kind || "unknown", recording ?? null, creator ?? null, payload);

    // Handle leave table based on recording status
    if (recording?.id) {
      const status = recording.status;
      const createdAt = recording.created_at;
      const updatedAt = recording.updated_at;

      if (status === "trashed") {
        // Delete the record from leave table
        await deleteLeaveByRecordingId(recording.id).catch((err) =>
          console.error("Failed to delete leave:", err.message)
        );
      } else if (status === "active") {
        if (createdAt && updatedAt && createdAt !== updatedAt) {
          // Created date differs from updated date — update the record
          const rawContent = stripHtml(recording.content) || recording.title || recording.subject || "";
          await updateLeaveContent(recording.id, rawContent).catch((err) =>
            console.error("Failed to update leave:", err.message)
          );
        } else {
          // New active record — store it
          const rawContent = stripHtml(recording.content) || recording.title || recording.subject || "";
          await upsertLeave(
            recording.id,
            creator?.name || null,
            creator?.avatar_url || null,
            creator?.email_address || null,
            null,
            rawContent,
          ).catch((err) =>
            console.error("Failed to upsert leave:", err.message)
          );
        }
      }
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("Webhook receive error:", error.message);
    return new Response(null, { status: 204 });
  }
}
