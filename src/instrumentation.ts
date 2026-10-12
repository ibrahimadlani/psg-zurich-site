// Runs once when the server boots (`node server.js` / `next start`).
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.NODE_ENV !== "production") return;
  // Separate module: keeps Node-only APIs out of the edge build of this file.
  const { onServerStart } = await import("./instrumentation-node");
  await onServerStart();
}
