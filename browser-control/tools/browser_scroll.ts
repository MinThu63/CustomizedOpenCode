import { tool } from "@opencode-ai/plugin"
import { browserAction } from "./browser.ts"

export default tool({
  description: "Scroll the page up or down, then snapshot/read again.",
  args: { direction: tool.schema.enum(["up", "down"]).describe("Direction").default("down") },
  async execute(args) {
    return browserAction("scroll", { direction: args.direction })
  },
})
