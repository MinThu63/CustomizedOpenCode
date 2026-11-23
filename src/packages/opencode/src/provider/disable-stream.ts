import { Option, Schema } from "effect"

type Fetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

type Choice = {
  index?: number
  finish_reason?: string
  message?: { role?: string; content?: string; tool_calls?: unknown }
}

type Completion = {
  id?: string
  created?: number
  model?: string
  choices?: Choice[]
  usage?: unknown
}

const parseJson = Schema.decodeUnknownOption(Schema.UnknownFromJsonString)

/**
 * Wraps a fetch so streaming chat requests are sent with `stream: false`, then
 * replays the single completion as one SSE `chat.completion.chunk` frame.
 *
 * Needed for OpenAI-compatible endpoints that only return valid responses when
 * not streaming. Enable with `"options": { "disableStream": true }`.
 */
export function disableStream(base: Fetch): Fetch {
  return async (input, init) => {
    const body = typeof init?.body === "string" ? parseJson(init.body) : Option.none()
    if (Option.isNone(body) || !isRecord(body.value) || body.value["stream"] !== true) return base(input, init)

    const { stream_options: _ignored, ...rest } = body.value
    const res = await base(input, { ...init, body: JSON.stringify({ ...rest, stream: false }) })
    // Pass non-OK responses through so the SDK surfaces the real upstream error.
    if (!res.ok) return res

    // The SDK's stream parser expects `chat.completion.chunk` frames with a
    // `delta`, so reshape the non-streaming `message` into one.
    const completion = (await res.json()) as Completion
    const chunk = {
      id: completion.id,
      object: "chat.completion.chunk",
      created: completion.created,
      model: completion.model,
      choices: (completion.choices ?? []).map((choice) => ({
        index: choice.index ?? 0,
        delta: {
          role: choice.message?.role ?? "assistant",
          content: choice.message?.content ?? "",
          ...(choice.message?.tool_calls ? { tool_calls: choice.message.tool_calls } : {}),
        },
        finish_reason: choice.finish_reason ?? "stop",
      })),
      ...(completion.usage ? { usage: completion.usage } : {}),
    }
    return new Response(`data: ${JSON.stringify(chunk)}\n\ndata: [DONE]\n\n`, {
      status: res.status,
      statusText: res.statusText,
      headers: { "content-type": "text/event-stream" },
    })
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
