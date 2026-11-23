// Shared helpers: full-desktop capture + local vision-model analysis.
// Uses Node APIs (opencode tool runtime is Node, not Bun).

import { execFile } from "node:child_process"
import { readFile, access, mkdir } from "node:fs/promises"
import { homedir } from "node:os"
import { join } from "node:path"

const VISION_URL = process.env.VISION_URL ?? "http://localhost:7878/v1/chat/completions"
const VISION_MODEL = process.env.VISION_MODEL ?? "qwen2.5-vl-7b-instruct"
const CAPTURE_SCRIPT =
  "C:\\Internship\\WORK\\Opencode\\OpencodeCustomizeApp\\browser-control\\capture\\screenshot.ps1"
const SHOT_DIR = join(homedir(), "Pictures", "MINTHU-Screenshots")

export function captureDesktop(outPath: string) {
  return new Promise<string>((resolve) => {
    execFile(
      "powershell",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", CAPTURE_SCRIPT, "-Out", outPath],
      { timeout: 30000 },
      (err, _o, stderr) => resolve(err ? stderr || err.message : ""),
    )
  })
}

export async function analyzeImageFile(imagePath: string, prompt: string) {
  const exists = await access(imagePath).then(() => true, () => false)
  if (!exists) return `image not found: ${imagePath}`
  const base64 = (await readFile(imagePath)).toString("base64")
  const res = await fetch(VISION_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model: VISION_MODEL,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt || "Describe this image." },
            { type: "image_url", image_url: { url: `data:image/png;base64,${base64}` } },
          ],
        },
      ],
      max_tokens: 400,
    }),
  }).catch((e: unknown) => (e instanceof Error ? e : new Error(String(e))))
  if (res instanceof Error) return `vision model unreachable at ${VISION_URL}: ${res.message}. Is LM Studio running?`
  if (!res.ok) return `vision model error ${res.status}`
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] }
  return data.choices?.[0]?.message?.content ?? "no analysis returned"
}

export async function captureAndAnalyze(question: string) {
  await mkdir(SHOT_DIR, { recursive: true })
  const outPath = join(SHOT_DIR, `screenshot-${timestamp()}.png`)
  const captureError = await captureDesktop(outPath)
  if (captureError) return `screenshot capture failed: ${captureError}`
  const analysis = await analyzeImageFile(outPath, question || "Describe what is on this screen.")
  return `${analysis}\n\n(screenshot saved: ${outPath})`
}

export function timestamp() {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}`
}
