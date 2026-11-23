// Bridge between the opencode tools and the Chrome extension.
// opencode tools POST an action here; the extension (via WebSocket) performs it and
// replies. Correlates request/response by requestId. A dumb relay.

const PORT = 8790
let socket: Bun.ServerWebSocket<unknown> | undefined
const pending = new Map<string, { resolve: (v: string) => void; reject: (e: Error) => void; timer: Timer }>()

const server = Bun.serve({
  port: PORT,
  async fetch(req, srv) {
    const url = new URL(req.url)
    if (url.pathname === "/ws") {
      if (srv.upgrade(req)) return undefined
      return new Response("upgrade failed", { status: 400 })
    }
    if (url.pathname === "/health") {
      return Response.json({ ok: true, extensionConnected: Boolean(socket) })
    }
    if (url.pathname === "/action" && req.method === "POST") {
      if (!socket) return Response.json({ error: "browser extension not connected" }, { status: 503 })
      const body = (await req.json()) as { action: string; payload?: Record<string, unknown> }
      const requestId = crypto.randomUUID()
      const result = await new Promise<string>((resolve, reject) => {
        const timer = setTimeout(() => {
          pending.delete(requestId)
          reject(new Error("extension did not respond in time"))
        }, 30000)
        pending.set(requestId, { resolve, reject, timer })
        socket!.send(JSON.stringify({ requestId, action: body.action, payload: body.payload }))
      }).catch((e: Error) => e)
      if (result instanceof Error) return Response.json({ error: result.message }, { status: 502 })
      return Response.json({ result })
    }
    return new Response("not found", { status: 404 })
  },
  websocket: {
    open(ws) {
      socket = ws
      console.log("extension connected")
    },
    close() {
      socket = undefined
      console.log("extension disconnected")
    },
    message(_ws, raw) {
      const msg = JSON.parse(String(raw)) as
        | { type: "hello" }
        | { type: "result"; requestId: string; result: string }
        | { type: "error"; requestId: string; message: string }
      if (msg.type === "hello") return
      const waiter = pending.get(msg.requestId)
      if (!waiter) return
      clearTimeout(waiter.timer)
      pending.delete(msg.requestId)
      if (msg.type === "result") return waiter.resolve(msg.result)
      return waiter.reject(new Error(msg.message))
    },
  },
})

console.log(`browser-control bridge listening on http://localhost:${server.port}`)
console.log("waiting for the Chrome extension to connect...")
