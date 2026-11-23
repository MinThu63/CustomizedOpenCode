// OpenCode Browser Control - extension background service worker.
// Connects to the local bridge (ws://localhost:8790/ws) and performs browser actions.
// Uses standard extension APIs (chrome.tabs/scripting/downloads), not CDP.

const BRIDGE_WS = "ws://localhost:8790/ws"
let ws
let reconnectTimer
let pingTimer

chrome.alarms.create("keepalive", { periodInMinutes: 0.4 })
chrome.alarms.onAlarm.addListener((a) => a.name === "keepalive" && connect())

function connect() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return
  ws = new WebSocket(BRIDGE_WS)
  ws.addEventListener("open", () => {
    console.log("[browser-control] connected to bridge")
    ws.send(JSON.stringify({ type: "hello" }))
    startPing()
  })
  ws.addEventListener("message", (e) => handle(JSON.parse(e.data)))
  ws.addEventListener("close", () => {
    stopPing()
    reconnectTimer = setTimeout(connect, 2000)
  })
  ws.addEventListener("error", () => {})
}
function startPing() {
  stopPing()
  pingTimer = setInterval(() => {
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "hello" }))
  }, 20000)
}
function stopPing() {
  clearInterval(pingTimer)
}

async function handle(msg) {
  if (msg.type === "hello") return
  const { requestId, action, payload } = msg
  try {
    const result = await perform(action, payload ?? {})
    ws.send(JSON.stringify({ type: "result", requestId, result }))
  } catch (e) {
    ws.send(JSON.stringify({ type: "error", requestId, message: String(e && e.message ? e.message : e) }))
  }
}

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
  if (!tab) throw new Error("no active tab")
  return tab
}

// Inject a function into every injectable http/https frame, tolerating restricted frames.
async function injectAllFrames(tabId, func, args) {
  const frames = await chrome.webNavigation.getAllFrames({ tabId }).catch(() => [])
  const ids = frames
    .filter((f) => f.url && (f.url.startsWith("http://") || f.url.startsWith("https://")))
    .map((f) => f.frameId)
  if (ids.length === 0) ids.push(0)
  const results = []
  for (const frameId of ids) {
    try {
      const out = await chrome.scripting.executeScript({ target: { tabId, frameIds: [frameId] }, func, args })
      if (out && out[0]) results.push(out[0].result)
    } catch {
      /* frame not injectable */
    }
  }
  return results
}

async function waitForLoad(tabId) {
  return new Promise((resolve) => {
    const listener = (id, info) => {
      if (id === tabId && info.status === "complete") {
        chrome.tabs.onUpdated.removeListener(listener)
        resolve()
      }
    }
    chrome.tabs.onUpdated.addListener(listener)
    setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener)
      resolve()
    }, 15000)
  })
}

async function perform(action, payload) {
  if (action === "version") return "bgjs-restored"
  if (action === "list_tabs") {
    const tabs = await chrome.tabs.query({})
    return tabs.map((t) => `[id=${t.id}]${t.active ? " (active)" : ""} ${t.title ?? ""} — ${t.url ?? ""}`).join("\n")
  }
  if (action === "switch_tab") {
    const target = await chrome.tabs.get(Number(payload.id))
    await chrome.tabs.update(target.id, { active: true })
    await chrome.windows.update(target.windowId, { focused: true })
    return `switched to tab ${payload.id}: ${target.title ?? target.url}`
  }
  if (action === "navigate") {
    const tab = await activeTab()
    await chrome.tabs.update(tab.id, { url: payload.url })
    await waitForLoad(tab.id)
    return `navigated to ${payload.url}`
  }
  const tab = await activeTab()
  if (action === "wait") {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: waitFor,
      args: [payload.text ?? null, Number(payload.timeout ?? 8000)],
    })
    return result
  }
  if (action === "find") {
    const frames = await injectAllFrames(tab.id, findElements, [String(payload.query ?? "")])
    const merged = frames.filter((r) => r && !r.startsWith("no elements")).join("\n")
    return merged || `no elements matching "${payload.query}"`
  }
  if (action === "read") {
    const frames = await injectAllFrames(tab.id, readContent, [payload.query ? String(payload.query) : null])
    return frames.filter(Boolean).join("\n") || "no readable content found"
  }
  if (action === "snapshot") {
    const limit = Number(payload.limit ?? 120)
    const frames = await injectAllFrames(tab.id, pageSnapshot, [limit])
    const topRes = frames.find((r) => r && r.url) || frames[0] || { url: tab.url, title: tab.title }
    const allElements = frames.map((r) => r && r.elements).filter((e) => e && !e.includes("showing 0 of 0")).join("\n")
    const allText = frames.map((r) => r && r.text).filter(Boolean).join("\n").slice(0, 4000)
    return `URL: ${topRes.url}\nTITLE: ${topRes.title}\n\nELEMENTS (all frames):\n${allElements}\n\nTEXT:\n${allText}`
  }
  if (action === "click") {
    const frames = await injectAllFrames(tab.id, doClick, [payload.ref])
    const hit = frames.find((r) => r && typeof r === "object" && r.clicked)
    if (hit && hit.navigate) {
      await chrome.tabs.update(tab.id, { url: hit.navigate })
      await waitForLoad(tab.id)
      return `clicked ref ${payload.ref} and navigated to ${hit.navigate}`
    }
    if (hit) return hit.message
    return `no element with ref ${payload.ref} in any frame (snapshot may be stale)`
  }
  if (action === "click_text") {
    const frames = await injectAllFrames(tab.id, doClickText, [String(payload.text ?? "")])
    const hit = frames.find((r) => r && typeof r === "object" && r.clicked)
    if (hit && hit.navigate) {
      await chrome.tabs.update(tab.id, { url: hit.navigate })
      await waitForLoad(tab.id)
      return `clicked "${payload.text}" and navigated to ${hit.navigate}`
    }
    if (hit) return hit.message
    return `no clickable element with text "${payload.text}" (searched all frames)`
  }
  if (action === "hover") {
    const frames = await injectAllFrames(tab.id, doHover, [payload.ref])
    return frames.find((r) => r && !r.startsWith("no element")) ?? `no element with ref ${payload.ref}`
  }
  if (action === "select_option") {
    const frames = await injectAllFrames(tab.id, doSelect, [payload.ref, String(payload.value ?? "")])
    return frames.find((r) => r && !r.startsWith("no ") && !r.startsWith("ref ")) ?? `could not select on ref ${payload.ref}`
  }
  if (action === "get_links") {
    const frames = await injectAllFrames(tab.id, getLinks, [payload.query ? String(payload.query) : null])
    const merged = frames.filter((r) => r && r !== "no links found").join("\n")
    return merged || "no links found"
  }
  if (action === "current_url") return `${tab.url}\nTITLE: ${tab.title ?? ""}`
  if (action === "go_back") {
    await chrome.tabs.goBack(tab.id)
    await waitForLoad(tab.id)
    return "went back"
  }
  if (action === "go_forward") {
    await chrome.tabs.goForward(tab.id)
    await waitForLoad(tab.id)
    return "went forward"
  }
  if (action === "reload") {
    await chrome.tabs.reload(tab.id)
    await waitForLoad(tab.id)
    return "reloaded"
  }
  if (action === "new_tab") {
    const created = await chrome.tabs.create({ url: payload.url ?? "chrome://newtab/", active: true })
    if (payload.url) await waitForLoad(created.id)
    return `opened new tab [id=${created.id}] ${payload.url ?? ""}`
  }
  if (action === "close_tab") {
    const id = payload.id ? Number(payload.id) : tab.id
    await chrome.tabs.remove(id)
    return `closed tab ${id}`
  }
  if (action === "screenshot") {
    let lastErr = ""
    for (let i = 0; i < 3; i++) {
      try {
        return await chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" })
      } catch (e) {
        lastErr = String(e && e.message ? e.message : e)
        await new Promise((r) => setTimeout(r, 500))
      }
    }
    return `screenshot error: ${lastErr}`
  }
  if (action === "download") {
    const id = await chrome.downloads.download({ url: payload.url, filename: payload.filename || undefined, saveAs: false })
    return `started download id=${id}: ${payload.url}${payload.filename ? ` -> ${payload.filename}` : ""}`
  }
  if (action === "type") {
    const frames = await injectAllFrames(tab.id, doType, [payload.ref, payload.text])
    return frames.find((r) => r && !r.startsWith("no element")) ?? `no element with ref ${payload.ref}`
  }
  if (action === "fill_field") {
    const frames = await injectAllFrames(tab.id, doFillField, [String(payload.label ?? ""), String(payload.text ?? "")])
    return frames.find((r) => r && r.startsWith("filled")) ?? frames.find((r) => r) ?? "field not found"
  }
  if (action === "key_sequence") {
    const keys = String(payload.keys ?? "").split(",").map((k) => k.trim()).filter(Boolean)
    for (const k of keys) {
      await injectAllFrames(tab.id, doPress, [k])
      await new Promise((r) => setTimeout(r, 250))
    }
    return `pressed sequence: ${keys.join(" ")}`
  }
  if (action === "press") {
    const frames = await injectAllFrames(tab.id, doPress, [payload.key])
    return frames.find((r) => r) ?? `pressed ${payload.key}`
  }
  if (action === "scroll") {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (dir) => window.scrollBy(0, dir === "up" ? -800 : 800),
      args: [payload.direction ?? "down"],
    })
    return `scrolled ${payload.direction ?? "down"}`
  }
  if (action === "evaluate") {
    try {
      const out = await chrome.scripting.executeScript({ target: { tabId: tab.id }, world: "MAIN", func: runUserScript, args: [String(payload.script ?? "")] })
      const r = out && out[0] ? out[0].result : undefined
      return r === undefined || r === null ? "script ran (no return value)" : String(r)
    } catch (e) {
      return `evaluate error: ${String(e && e.message ? e.message : e)}`
    }
  }
  throw new Error(`unknown action: ${action}`)
}

// ---- Injected functions (must be self-contained for isolated-world injection) ----

function waitFor(text, timeout) {
  return new Promise((resolve) => {
    const start = Date.now()
    const check = () => {
      const ready = document.readyState === "complete"
      const hasText = !text || document.body.innerText.toLowerCase().includes(String(text).toLowerCase())
      if (ready && hasText) return resolve(text ? `found "${text}"` : "page ready")
      if (Date.now() - start > timeout) return resolve(text ? `timeout waiting for "${text}"` : "timeout; proceeding")
      setTimeout(check, 300)
    }
    check()
  })
}

function pageSnapshot(limit) {
  const max = typeof limit === "number" && limit > 0 ? limit : 120
  const hash = (s) => {
    let h = 0
    for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i)
    return h
  }
  const framePrefix = location === top ? "" : "f" + Math.abs(hash(location.href)).toString(36).slice(0, 4) + "-"
  const all = []
  const walk = (root) => {
    const nodes = root.querySelectorAll("*")
    for (const el of nodes) {
      all.push(el)
      if (el.shadowRoot) walk(el.shadowRoot)
    }
  }
  walk(document)
  const isInteractive = (el) => {
    const tag = el.tagName ? el.tagName.toLowerCase() : ""
    if (["a", "button", "input", "textarea", "select"].includes(tag)) return true
    const role = el.getAttribute && el.getAttribute("role")
    if (role && ["button", "link", "tab", "menuitem", "option", "combobox", "textbox", "searchbox"].includes(role)) return true
    if (el.hasAttribute && (el.hasAttribute("onclick") || el.getAttribute("contenteditable") === "true")) return true
    if (el.hasAttribute && el.hasAttribute("tabindex") && el.getAttribute("tabindex") !== "-1") return true
    try {
      const cs = getComputedStyle(el)
      if (cs && cs.cursor === "pointer" && el.children.length <= 2 && el.innerText && el.innerText.trim()) return true
    } catch {}
    return false
  }
  const laidOut = all.filter((el) => {
    if (!isInteractive(el)) return false
    const r = el.getBoundingClientRect()
    return r.width > 0 && r.height > 0
  })
  const elements = laidOut.slice(0, max).map((el, i) => {
    const ref = framePrefix + i
    el.setAttribute("data-oc-ref", ref)
    const label = el.getAttribute("aria-label") || el.placeholder || el.innerText || el.value || el.getAttribute("title") || ""
    return `[${ref}] <${el.tagName.toLowerCase()}> ${label.replace(/\s+/g, " ").trim().slice(0, 80)}`
  }).join("\n")
  return {
    url: location === top ? location.href : null,
    title: document.title,
    elements: laidOut.length ? `${elements}\n(showing ${Math.min(laidOut.length, max)} of ${laidOut.length} interactive elements)` : "(showing 0 of 0)",
    text: (document.body.innerText || "").replace(/\s+/g, " ").slice(0, 3000),
  }
}

function readContent(query) {
  const q = query ? query.toLowerCase() : null
  const sel = "h1,h2,h3,h4,li,td,th,a,button,span,p,strong,b,label,[role=heading],[aria-label]"
  const nodes = Array.from(document.querySelectorAll(sel))
  const seen = new Set()
  const lines = []
  for (const el of nodes) {
    const r = el.getBoundingClientRect()
    if (r.width === 0 || r.height === 0) continue
    if (el.children.length > 2 && el.innerText && el.innerText.length > 160) continue
    const text = (el.getAttribute("aria-label") || el.innerText || "").replace(/\s+/g, " ").trim()
    if (!text || text.length < 2 || text.length > 200) continue
    if (seen.has(text)) continue
    if (q && !text.toLowerCase().includes(q)) continue
    seen.add(text)
    lines.push(text)
    if (lines.length >= 300) break
  }
  const prefix = location === top ? "" : "[frame] "
  return lines.length ? prefix + lines.join("\n" + prefix) : ""
}

function findElements(query) {
  const q = query.toLowerCase()
  const hash = (s) => {
    let h = 0
    for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i)
    return h
  }
  const framePrefix = location === top ? "" : "f" + Math.abs(hash(location.href)).toString(36).slice(0, 4) + "-"
  const nodes = []
  const walk = (root) => {
    const ns = root.querySelectorAll ? root.querySelectorAll("*") : []
    for (const el of ns) {
      nodes.push(el)
      if (el.shadowRoot) walk(el.shadowRoot)
    }
  }
  walk(document)
  const matches = []
  let n = 0
  for (const el of nodes) {
    const r = el.getBoundingClientRect()
    if (r.width === 0 || r.height === 0) continue
    const label = (el.getAttribute("aria-label") || el.innerText || el.value || "").trim()
    if (!label || !label.toLowerCase().includes(q)) continue
    if (el.children.length > 3 && label.length > 120) continue
    const ref = framePrefix + n
    el.setAttribute("data-oc-ref", ref)
    matches.push(`[${ref}] <${el.tagName.toLowerCase()}> ${label.replace(/\s+/g, " ").slice(0, 100)}`)
    n++
    if (n >= 60) break
  }
  return matches.length ? matches.join("\n") : `no elements matching "${query}"`
}

function doClick(ref) {
  const refLookup = (ref) => {
    const direct = document.querySelector(`[data-oc-ref="${ref}"]`)
    if (direct) return direct
    const stack = [document]
    while (stack.length) {
      const root = stack.pop()
      const hit = root.querySelector && root.querySelector(`[data-oc-ref="${ref}"]`)
      if (hit) return hit
      const hosts = root.querySelectorAll ? root.querySelectorAll("*") : []
      for (const el of hosts) if (el.shadowRoot) stack.push(el.shadowRoot)
    }
    return null
  }
  const el = refLookup(ref)
  if (!el) return { clicked: false }
  el.scrollIntoView({ block: "center", inline: "center" })
  const rect = el.getBoundingClientRect()
  const opts = { bubbles: true, cancelable: true, view: window, clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 }
  for (const type of ["pointerdown", "mousedown", "pointerup", "mouseup", "click"]) el.dispatchEvent(new MouseEvent(type, opts))
  const link = el.closest && el.closest("a[href]")
  const href = link && link.getAttribute("href")
  if (href && !href.startsWith("javascript:") && !href.startsWith("#")) return { clicked: true, message: `clicked ref ${ref}`, navigate: new URL(href, location.href).href }
  return { clicked: true, message: `clicked ref ${ref}` }
}

function doClickText(text) {
  const q = text.toLowerCase()
  const all = []
  const walk = (root) => {
    const ns = root.querySelectorAll ? root.querySelectorAll("*") : []
    for (const el of ns) {
      all.push(el)
      if (el.shadowRoot) walk(el.shadowRoot)
    }
  }
  walk(document)
  const labelOf = (el) => (el.getAttribute("aria-label") || el.innerText || el.value || "").trim()
  const candidates = all.filter((el) => {
    const r = el.getBoundingClientRect()
    if (r.width === 0 || r.height === 0) return false
    return labelOf(el).toLowerCase().includes(q)
  })
  if (!candidates.length) return { clicked: false, message: "no match in this frame" }
  const isClickable = (el) => {
    const tag = el.tagName ? el.tagName.toLowerCase() : ""
    return tag === "a" || tag === "button" || el.getAttribute?.("role") === "button" || el.getAttribute?.("role") === "link" || typeof el.onclick === "function" || el.hasAttribute?.("onclick")
  }
  const score = (el) => {
    const label = labelOf(el).toLowerCase()
    return (label === q ? 0 : 1) * 1000 + label.length
  }
  const ancestor = (el) => {
    let node = el
    for (let i = 0; i < 6 && node; i++) {
      if (isClickable(node)) return node
      node = node.parentElement
    }
    return el
  }
  const click = (el, desc) => {
    el.scrollIntoView({ block: "center", inline: "center" })
    const rect = el.getBoundingClientRect()
    const opts = { bubbles: true, cancelable: true, view: window, clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 }
    for (const type of ["pointerdown", "mousedown", "pointerup", "mouseup", "click"]) el.dispatchEvent(new MouseEvent(type, opts))
    const link = el.closest && el.closest("a[href]")
    const href = link && link.getAttribute("href")
    if (href && !href.startsWith("javascript:") && !href.startsWith("#")) return { clicked: true, message: `clicked ${desc}`, navigate: new URL(href, location.href).href }
    return { clicked: true, message: `clicked ${desc}` }
  }
  candidates.sort((a, b) => score(a) - score(b))
  for (const cand of candidates.slice(0, 8)) {
    if (isClickable(cand)) return click(cand, `"${text}"`)
    const up = ancestor(cand)
    if (isClickable(up)) return click(up, `"${text}"`)
    const inner = cand.querySelector && cand.querySelector("a[href], button, [role=button], [role=link]")
    if (inner) return click(inner, `"${text}"`)
  }
  return click(candidates[0], `"${text}"`)
}

function doHover(ref) {
  const refLookup = (ref) => {
    const direct = document.querySelector(`[data-oc-ref="${ref}"]`)
    if (direct) return direct
    const stack = [document]
    while (stack.length) {
      const root = stack.pop()
      const hit = root.querySelector && root.querySelector(`[data-oc-ref="${ref}"]`)
      if (hit) return hit
      const hosts = root.querySelectorAll ? root.querySelectorAll("*") : []
      for (const el of hosts) if (el.shadowRoot) stack.push(el.shadowRoot)
    }
    return null
  }
  const el = refLookup(ref)
  if (!el) return `no element with ref ${ref}`
  const rect = el.getBoundingClientRect()
  const opts = { bubbles: true, clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 }
  for (const type of ["pointerover", "mouseover", "pointerenter", "mouseenter", "mousemove"]) el.dispatchEvent(new MouseEvent(type, opts))
  return `hovered ref ${ref}`
}

function doSelect(ref, value) {
  const refLookup = (ref) => {
    const direct = document.querySelector(`[data-oc-ref="${ref}"]`)
    if (direct) return direct
    const stack = [document]
    while (stack.length) {
      const root = stack.pop()
      const hit = root.querySelector && root.querySelector(`[data-oc-ref="${ref}"]`)
      if (hit) return hit
      const hosts = root.querySelectorAll ? root.querySelectorAll("*") : []
      for (const el of hosts) if (el.shadowRoot) stack.push(el.shadowRoot)
    }
    return null
  }
  const el = refLookup(ref)
  if (!el || el.tagName.toLowerCase() !== "select") return `ref ${ref} is not a <select>`
  const opt = Array.from(el.options).find((o) => o.value === value || o.text.toLowerCase().includes(value.toLowerCase()))
  if (!opt) return `no option matching "${value}"`
  el.value = opt.value
  el.dispatchEvent(new Event("change", { bubbles: true }))
  return `selected "${opt.text}"`
}

function getLinks(query) {
  const q = query ? query.toLowerCase() : null
  const links = Array.from(document.querySelectorAll("a[href]"))
    .map((a) => ({ text: (a.innerText || a.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim(), href: a.href }))
    .filter((l) => l.href && !l.href.startsWith("javascript:"))
    .filter((l) => !q || l.text.toLowerCase().includes(q) || l.href.toLowerCase().includes(q))
    .slice(0, 80)
  return links.length ? links.map((l) => `${l.text || "(no text)"} -> ${l.href}`).join("\n") : "no links found"
}

function doType(ref, text) {
  const refLookup = (ref) => {
    const direct = document.querySelector(`[data-oc-ref="${ref}"]`)
    if (direct) return direct
    const stack = [document]
    while (stack.length) {
      const root = stack.pop()
      const hit = root.querySelector && root.querySelector(`[data-oc-ref="${ref}"]`)
      if (hit) return hit
      const hosts = root.querySelectorAll ? root.querySelectorAll("*") : []
      for (const el of hosts) if (el.shadowRoot) stack.push(el.shadowRoot)
    }
    return null
  }
  const el = refLookup(ref)
  if (!el) return `no element with ref ${ref}`
  el.focus()
  const setter = Object.getOwnPropertyDescriptor(el.__proto__, "value")?.set
  if (setter) setter.call(el, text)
  else el.value = text
  el.dispatchEvent(new Event("input", { bubbles: true }))
  el.dispatchEvent(new Event("change", { bubbles: true }))
  return `typed into ref ${ref}`
}

function doFillField(label, text) {
  const q = label.toLowerCase()
  const all = []
  const walk = (root) => {
    const ns = root.querySelectorAll ? root.querySelectorAll("input, textarea, [contenteditable=true], [role=combobox], [role=searchbox]") : []
    for (const el of ns) all.push(el)
    const hosts = root.querySelectorAll ? root.querySelectorAll("*") : []
    for (const el of hosts) if (el.shadowRoot) walk(el.shadowRoot)
  }
  walk(document)
  const describe = (el) => (el.getAttribute("aria-label") || el.placeholder || el.getAttribute("name") || el.getAttribute("title") || "").toLowerCase()
  let field = all.find((el) => {
    const r = el.getBoundingClientRect()
    return r.width > 0 && r.height > 0 && describe(el).includes(q)
  })
  if (!field) {
    const visible = all.filter((el) => {
      const r = el.getBoundingClientRect()
      return r.width > 0 && r.height > 0
    })
    field = visible[0]
  }
  if (!field) return "field not found"
  field.scrollIntoView({ block: "center" })
  field.focus()
  field.click()
  const proto = field.tagName === "INPUT" || field.tagName === "TEXTAREA" ? Object.getPrototypeOf(field) : null
  const setter = proto ? Object.getOwnPropertyDescriptor(proto, "value")?.set : null
  const setVal = (v) => {
    if (setter) setter.call(field, v)
    else if ("value" in field) field.value = v
    else field.textContent = v
    field.dispatchEvent(new Event("input", { bubbles: true }))
    field.dispatchEvent(new Event("change", { bubbles: true }))
  }
  setVal("")
  let acc = ""
  for (const ch of String(text)) {
    acc += ch
    setVal(acc)
    for (const type of ["keydown", "keypress", "input", "keyup"]) {
      field.dispatchEvent(type === "input" ? new Event("input", { bubbles: true }) : new KeyboardEvent(type, { key: ch, bubbles: true }))
    }
  }
  return `filled "${describe(field) || "field"}" with "${text}"`
}

function doPress(key) {
  const el = document.activeElement || document.body
  for (const type of ["keydown", "keypress", "keyup"]) el.dispatchEvent(new KeyboardEvent(type, { key, bubbles: true }))
  if (key === "Enter" && el.form) el.form.requestSubmit?.()
  return `pressed ${key}`
}

function runUserScript(script) {
  const settle = (v) => {
    if (v === undefined || v === null) return "__no_result__"
    if (typeof v === "object") {
      try {
        return JSON.stringify(v).slice(0, 4000)
      } catch {
        return String(v)
      }
    }
    return String(v).slice(0, 4000)
  }
  try {
    const fn = new Function(script)
    const value = fn()
    if (value && typeof value.then === "function") return value.then(settle, (e) => "script error: " + (e && e.message ? e.message : String(e)))
    return settle(value)
  } catch (e) {
    return "script error: " + (e && e.message ? e.message : String(e))
  }
}

connect()
