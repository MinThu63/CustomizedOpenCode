// Shared helper: send an action to the local browser-control bridge (port 8790),
// which forwards it to the Chrome extension.

const BRIDGE = "http://localhost:8790"

export async function browserAction(action: string, payload?: Record<string, unknown>) {
  const res = await fetch(`${BRIDGE}/action`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action, payload }),
  }).catch(() => undefined)
  if (!res) {
    return "Browser bridge is not running. Start it: bun run browser-control/server/index.ts (and load the extension from browser-control/extension)."
  }
  const data = (await res.json()) as { result?: string; error?: string }
  if (!res.ok) return `Browser action failed: ${data.error ?? res.status}`
  return data.result ?? "(no result)"
}
