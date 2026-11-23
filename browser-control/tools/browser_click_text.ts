import { tool } from "@opencode-ai/plugin"
import { browserAction } from "./browser.ts"

export default tool({
  description: "Click an element by its visible text (resolves tiles/links/buttons). Best for named items like menu entries or course tiles.",
  args: { text: tool.schema.string().describe("Visible text to click") },
  async execute(args) {
    return browserAction("click_text", { text: args.text })
  },
})
