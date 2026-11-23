import { tool } from "@opencode-ai/plugin"
import { browserAction } from "./browser.ts"

export default tool({
  description: "Capture the page: numbered clickable/typeable elements (incl. below the fold) + text. For ACTING (click/type). Increase limit for long lists.",
  args: { limit: tool.schema.number().describe("Max elements (default 120)").default(120) },
  async execute(args) {
    return browserAction("snapshot", { limit: args.limit })
  },
})
