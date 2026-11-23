import { tool } from "@opencode-ai/plugin"
import { browserAction } from "./browser.ts"

export default tool({
  description: "Choose an option in a native select dropdown by ref, matching by value or text.",
  args: { ref: tool.schema.number().describe("Select ref"), value: tool.schema.string().describe("Option value or text") },
  async execute(args) {
    return browserAction("select_option", { ref: args.ref, value: args.value })
  },
})
