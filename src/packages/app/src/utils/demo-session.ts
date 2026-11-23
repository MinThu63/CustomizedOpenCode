import { Option, Schema } from "effect"

export const DEPARTMENTS = ["Engineering", "Finance", "Human Resources", "IT Support", "Marketing", "Operations"] as const

const KEY = "minthu.demo.session"

const Session = Schema.Struct({
  username: Schema.String,
  department: Schema.String,
  signedInAt: Schema.Number,
})
export type DemoSession = typeof Session.Type

const decode = Schema.decodeUnknownOption(Schema.UnknownFromJsonString.pipe(Schema.decodeTo(Session)))

/**
 * Demo sign-in: nothing is verified or sent anywhere, and the password is never
 * stored. Only the username and department are kept, in localStorage.
 */
export function validateLogin(input: { username: string; password: string; department: string }) {
  if (!input.username.trim()) return "Enter your employee ID or username."
  if (!input.password) return "Enter your password."
  if (!DEPARTMENTS.some((item) => item === input.department)) return "Select your department."
}

export function createSession(input: { username: string; department: string }, now = Date.now()): DemoSession {
  return { username: input.username.trim(), department: input.department, signedInAt: now }
}

export function parseSession(raw: string | null | undefined) {
  if (!raw) return undefined
  return Option.getOrUndefined(decode(raw))
}

/** "aye.chan_win" becomes "Aye Chan Win". */
export function displayName(username: string) {
  return username
    .split(/[._\-\s]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ")
}

export function readSession() {
  try {
    return parseSession(localStorage.getItem(KEY))
  } catch {
    return undefined
  }
}

export function writeSession(session: DemoSession | undefined) {
  try {
    if (session) localStorage.setItem(KEY, JSON.stringify(session))
    else localStorage.removeItem(KEY)
  } catch {
    // Storage can be blocked; the session then lasts until reload.
  }
}
