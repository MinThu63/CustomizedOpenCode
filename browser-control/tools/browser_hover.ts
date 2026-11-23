import { tool } from "@opencode-ai/plugin"
import { browserAction } from "./browser.ts"

export default tool({
  description: "Hover over an element by ref to reveal dropdown/flyout menus, then snapshot.",
  args: { ref: tool.schema.number().describe("Element ref") },
  async execute(args) {
    return browserAction("hover", { ref: args.ref })
  },
})
