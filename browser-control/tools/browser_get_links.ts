import { tool } from "@opencode-ai/plugin"
import { browserAction } from "./browser.ts"

export default tool({
  description: "List page links (href) with text; optional query filter. Use to find a file URL to download.",
  args: { query: tool.schema.string().describe("Optional filter").optional() },
  async execute(args) {
    return browserAction("get_links", { query: args.query })
  },
})
