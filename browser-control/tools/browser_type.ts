import { tool } from "@opencode-ai/plugin"
import { browserAction } from "./browser.ts"

export default tool({
  description: "Type text into an input by its ref number from browser_snapshot.",
  args: { ref: tool.schema.string().describe("Input ref"), text: tool.schema.string().describe("Text to type") },
  async execute(args) {
    return browserAction("type", { ref: args.ref, text: args.text })
  },
})
