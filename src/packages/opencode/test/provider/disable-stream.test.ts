import { expect, test } from "bun:test"
import { disableStream } from "@/provider/disable-stream"

const completion = {
  id: "c1",
  created: 1,
  model: "m",
  choices: [{ index: 0, finish_reason: "stop", message: { role: "assistant", content: "hi" } }],
  usage: { total_tokens: 3 },
}

test("rewrites a streaming request and replays the completion as one SSE chunk", async () => {
  const sent: unknown[] = []
  const fetcher = disableStream(async (_input, init) => {
    sent.push(JSON.parse(String(init?.body)))
    return Response.json(completion)
  })

  const res = await fetcher("http://x", {
    method: "POST",
    body: JSON.stringify({ stream: true, stream_options: { include_usage: true }, model: "m" }),
  })

  expect(sent).toEqual([{ stream: false, model: "m" }])
  expect(res.headers.get("content-type")).toBe("text/event-stream")
  const text = await res.text()
  expect(text).toContain('"object":"chat.completion.chunk"')
  expect(text).toContain('"delta":{"role":"assistant","content":"hi"}')
  expect(text.endsWith("data: [DONE]\n\n")).toBe(true)
})

test("passes non-streaming requests through untouched", async () => {
  const fetcher = disableStream(async () => new Response("plain"))
  const res = await fetcher("http://x", { method: "POST", body: JSON.stringify({ stream: false }) })
  expect(await res.text()).toBe("plain")
})

test("passes upstream errors through", async () => {
  const fetcher = disableStream(async () => new Response("nope", { status: 500 }))
  const res = await fetcher("http://x", { method: "POST", body: JSON.stringify({ stream: true }) })
  expect(res.status).toBe(500)
})

test("ignores bodies that are not JSON", async () => {
  const fetcher = disableStream(async () => new Response("ok"))
  const res = await fetcher("http://x", { method: "POST", body: "not json" })
  expect(await res.text()).toBe("ok")
})
