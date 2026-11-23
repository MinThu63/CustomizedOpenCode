import { tool } from "@opencode-ai/plugin"
import { browserAction } from "./browser.ts"

export default tool({
  description: "Send a sequence of keys to the focused element, e.g. ArrowDown,Enter to pick an autocomplete suggestion.",
  args: { keys: tool.schema.string().describe("Comma-separated keys") },
  async execute(args) {
    return browserAction("key_sequence", { keys: args.keys })
  },
})
