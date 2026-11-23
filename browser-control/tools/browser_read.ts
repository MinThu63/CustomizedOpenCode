import { tool } from "@opencode-ai/plugin"
import { browserAction } from "./browser.ts"

export default tool({
  description: "Read clean visible text (headings, prices, names, lists). For READING content on content-heavy sites. Optional query filters lines.",
  args: { query: tool.schema.string().describe("Optional text filter, e.g. $ or ipad").optional() },
  async execute(args) {
    return browserAction("read", { query: args.query })
  },
})
