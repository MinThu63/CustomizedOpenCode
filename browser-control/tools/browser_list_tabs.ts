import { tool } from "@opencode-ai/plugin"
import { browserAction } from "./browser.ts"

export default tool({
  description: "List all open browser tabs (id, title, URL).",
  args: {},
  async execute(args) {
    return browserAction("list_tabs")
  },
})
