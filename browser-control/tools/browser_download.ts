import { tool } from "@opencode-ai/plugin"
import { browserAction } from "./browser.ts"

export default tool({
  description: "Download a file from a URL via the logged-in browser session (works behind login).",
  args: { url: tool.schema.string().describe("File URL"), filename: tool.schema.string().describe("Optional filename").optional() },
  async execute(args) {
    return browserAction("download", { url: args.url, filename: args.filename })
  },
})
