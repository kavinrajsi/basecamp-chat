#!/usr/bin/env node
/**
 * Starts ngrok tunnel pointing at the Next.js dev server (port 3000).
 * Usage: npm run tunnel
 *
 * The public URL is printed to stdout. Update BASECAMP_REDIRECT_URI
 * in .env.local with the printed URL + /api/auth/callback, then
 * also update the redirect URI in your Basecamp OAuth app settings.
 */

import ngrok from "@ngrok/ngrok";

const PORT = process.env.PORT || 3000;

const listener = await ngrok.forward({
  addr: PORT,
  authtoken_from_env: true, // reads NGROK_AUTHTOKEN env var, or falls back to ~/.config/ngrok
});

const url = listener.url();
console.log("\n────────────────────────────────────────");
console.log("  ngrok tunnel active");
console.log(`  Public URL : ${url}`);
console.log(`  Callback   : ${url}/api/auth/callback`);
console.log("\n  → Set in .env.local:");
console.log(`    BASECAMP_REDIRECT_URI=${url}/api/auth/callback`);
console.log("\n  → Set in Basecamp OAuth app (https://launchpad.37signals.com/integrations):");
console.log(`    Redirect URI: ${url}/api/auth/callback`);
console.log("────────────────────────────────────────\n");

// Keep the process alive so the tunnel stays open
process.on("SIGINT", async () => {
  await ngrok.disconnect();
  process.exit(0);
});
