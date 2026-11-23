import { tool } from "@opencode-ai/plugin"
import { browserAction } from "./browser.ts"

export default tool({
  description: "Run synchronous JavaScript in the page (escape hatch for SPAs/shadow DOM). End with return a value.",
  args: { script: tool.schema.string().describe("JS, end with return value") },
  async execute(args) {
    return browserAction("evaluate", { script: args.script })
  },
})
