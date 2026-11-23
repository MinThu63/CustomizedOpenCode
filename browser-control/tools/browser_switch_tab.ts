import { tool } from "@opencode-ai/plugin"
import { browserAction } from "./browser.ts"

export default tool({
  description: "Focus an open tab by its id from browser_list_tabs, then snapshot/read it.",
  args: { id: tool.schema.number().describe("Tab id") },
  async execute(args) {
    return browserAction("switch_tab", { id: args.id })
  },
})
