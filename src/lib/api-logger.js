// Server-side request/response logger for API route handlers.
// Wrap a handler with withApiLogging(label, handler); logs method, path,
// response status, and duration to the dev-server terminal (and errors).
export function withApiLogging(label, handler) {
  return async (...args) => {
    const req = args[0];
    const method = req?.method ?? "?";
    let path = label;
    try {
      const u = new URL(req.url);
      path = u.pathname + u.search;
    } catch {
      // no request URL (shouldn't happen for route handlers) — fall back to label
    }
    const start = Date.now();
    try {
      const res = await handler(...args);
      const ms = Date.now() - start;
      console.log(`[api] ${method} ${path} -> ${res?.status ?? "?"} (${ms}ms)`);
      return res;
    } catch (err) {
      const ms = Date.now() - start;
      console.error(`[api] ${method} ${path} -> ERROR (${ms}ms):`, err?.message ?? err);
      throw err;
    }
  };
}
