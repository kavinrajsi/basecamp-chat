import { insertWebhookEvent, deleteLeaveByRecordingId } from "@/lib/db";
import { extractAndStoreLeave } from "@/lib/leave-ai";

export async function POST(request) {
  try {
    const payload = await request.json();
    const { kind, recording, creator } = payload;

    await insertWebhookEvent(kind || "unknown", recording ?? null, creator ?? null, payload);

    // Handle leave table based on recording status
    if (recording?.id) {
      const status = recording.status;

      if (status === "trashed") {
        await deleteLeaveByRecordingId(recording.id).catch((err) =>
          console.error("Failed to delete leave:", err.message)
        );
      } else if (status === "active") {
        // Extract leave/WFH dates via AI and store automatically
        await extractAndStoreLeave(recording, creator).catch((err) =>
          console.error("Failed to extract/store leave:", err.message)
        );
      }
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("Webhook receive error:", error.message);
    return new Response(null, { status: 204 });
  }
}
