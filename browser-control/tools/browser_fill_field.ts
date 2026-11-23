import { tool } from "@opencode-ai/plugin"
import { browserAction } from "./browser.ts"

export default tool({
  description: "Fill a form field by its visible label/placeholder (no ref) and type with real key events so autocomplete reacts. For SPA forms where ref typing fails.",
  args: { label: tool.schema.string().describe("Field label/placeholder"), text: tool.schema.string().describe("Value to type") },
  async execute(args) {
    return browserAction("fill_field", { label: args.label, text: args.text })
  },
})
