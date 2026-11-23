import { tool } from "@opencode-ai/plugin"
import { browserAction } from "./browser.ts"

export default tool({
  description: "Click an element by its ref number from the latest browser_snapshot/browser_find.",
  args: { ref: tool.schema.string().describe("Ref from snapshot") },
  async execute(args) {
    return browserAction("click", { ref: args.ref })
  },
})
