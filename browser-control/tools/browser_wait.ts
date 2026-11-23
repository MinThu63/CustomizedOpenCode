import { tool } from "@opencode-ai/plugin"
import { browserAction } from "./browser.ts"

export default tool({
  description: "Wait for the page to load, optionally until some text appears. Use after navigating on dynamic sites.",
  args: { text: tool.schema.string().describe("Optional text to wait for").optional(), timeout: tool.schema.number().describe("Max ms (default 8000)").default(8000) },
  async execute(args) {
    return browserAction("wait", { text: args.text, timeout: args.timeout })
  },
})
