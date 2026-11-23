import { tool } from "@opencode-ai/plugin"
import { browserAction } from "./browser.ts"
import { captureDesktop, analyzeImageFile } from "./vision.ts"
import { writeFile, mkdir } from "node:fs/promises"
import { homedir } from "node:os"
import { join } from "node:path"

const SHOT_DIR = join(homedir(), "Pictures", "MINTHU-Screenshots")

export default tool({
  description:
    "Screenshot the current browser tab as displayed and SAVE it as a PNG. Falls back to full-desktop capture if tab capture fails. Set verify=true to have the vision model confirm what the image shows. NOT for downloading an image file (use browser_download).",
  args: {
    name: tool.schema.string().describe("Optional base filename").optional(),
    verify: tool.schema.boolean().describe("Verify the saved image with the vision model").default(false),
  },
  async execute(args) {
    await mkdir(SHOT_DIR, { recursive: true })
    const safe = (args.name ?? "page").replace(/[^a-zA-Z0-9-_]/g, "-").slice(0, 60)
    const outPath = join(SHOT_DIR, `${safe}-${timestamp()}.png`)
    const result = await browserAction("screenshot")
    let how = "browser tab"
    if (result.startsWith("data:image")) {
      await writeFile(outPath, Buffer.from(result.slice(result.indexOf(",") + 1), "base64"))
    } else {
      const deskErr = await captureDesktop(outPath)
      if (deskErr) return `screenshot failed. tab: ${result}; desktop: ${deskErr}`
      how = "full desktop (tab capture failed, used fallback)"
    }
    let msg = `screenshot saved via ${how}: ${outPath}`
    if (args.verify) {
      const analysis = await analyzeImageFile(outPath, "In 1-2 sentences, what does this screenshot show?")
      msg += `\n\nvision check: ${analysis}`
    }
    return msg
  },
})

function timestamp() {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}`
}
