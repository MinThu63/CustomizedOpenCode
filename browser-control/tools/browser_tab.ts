import { tool } from "@opencode-ai/plugin"
import { browserAction } from "./browser.ts"

export default tool({
  description:
    "Manage tabs/history: new_tab, close_tab, go_back, go_forward, reload, or current_url.",
  args: {
    action: tool.schema.enum(["new_tab", "close_tab", "go_back", "go_forward", "reload", "current_url"]).describe("Operation"),
    url: tool.schema.string().describe("URL for new_tab").optional(),
    id: tool.schema.number().describe("Tab id for close_tab").optional(),
  },
  async execute(args) {
    return browserAction(args.action, { url: args.url, id: args.id })
  },
})
