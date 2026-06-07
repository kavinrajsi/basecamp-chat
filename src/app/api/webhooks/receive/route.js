import { insertWebhookEvent } from "@/lib/db";
import { withApiLogging } from "@/lib/api-logger";

export const POST = withApiLogging("webhooks/receive:POST", webhookReceivePost);
async function webhookReceivePost(request) {
  try {
    const payload = await request.json();
    const { kind, recording, creator } = payload;

    await insertWebhookEvent(kind || "unknown", recording ?? null, creator ?? null, payload);

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("Webhook receive error:", error.message);
    return new Response(null, { status: 204 });
  }
}
