import { tool } from "@opencode-ai/plugin"
import { browserAction } from "./browser.ts"

export default tool({
  description:
    "Open a URL in the user's visible browser. Use to start a web task. After navigating, call browser_snapshot or browser_read to see the page.",
  args: { url: tool.schema.string().describe("Full URL, e.g. https://www.youtube.com") },
  async execute(args) {
    return browserAction("navigate", { url: args.url })
  },
})
