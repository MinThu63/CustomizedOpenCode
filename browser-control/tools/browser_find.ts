import { tool } from "@opencode-ai/plugin"
import { browserAction } from "./browser.ts"

export default tool({
  description: "Find elements matching text anywhere on the page, returning ref numbers for browser_click.",
  args: { query: tool.schema.string().describe("Text to find") },
  async execute(args) {
    return browserAction("find", { query: args.query })
  },
})
