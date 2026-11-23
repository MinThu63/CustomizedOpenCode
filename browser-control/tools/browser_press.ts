import { tool } from "@opencode-ai/plugin"
import { browserAction } from "./browser.ts"

export default tool({
  description: "Press a keyboard key (e.g. Enter) on the current page.",
  args: { key: tool.schema.string().describe("Key name, e.g. Enter") },
  async execute(args) {
    return browserAction("press", { key: args.key })
  },
})
