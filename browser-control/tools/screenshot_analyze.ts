import { tool } from "@opencode-ai/plugin"
import { captureAndAnalyze } from "./vision.ts"

export default tool({
  description:
    "Screenshot the ENTIRE desktop (any app, not just the browser) and analyze it with the local vision model. Use when the user asks what's on screen, to read a window/chart/PDF, or for canvas apps (Google Sheets/Docs) the DOM can't read.",
  args: {
    question: tool.schema.string().describe("What to look for, e.g. 'what app is open', 'read the error'").default("Describe what is on this screen."),
  },
  async execute(args) {
    return captureAndAnalyze(args.question)
  },
})
