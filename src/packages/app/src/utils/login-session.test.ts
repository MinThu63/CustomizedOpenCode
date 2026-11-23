import { describe, expect, test } from "bun:test"
import { createSession, displayName, parseSession, validateLogin } from "./login-session"

describe("validateLogin", () => {
  test("accepts any username and password with a known department", () => {
    expect(validateLogin({ username: "aye.chan", password: "x", department: "Finance" })).toBeUndefined()
  })

  test("rejects missing fields", () => {
    expect(validateLogin({ username: " ", password: "x", department: "Finance" })).toContain("username")
    expect(validateLogin({ username: "a", password: "", department: "Finance" })).toContain("password")
    expect(validateLogin({ username: "a", password: "x", department: "Nowhere" })).toContain("department")
  })
})

describe("session", () => {
  test("round-trips and never contains a password", () => {
    const session = createSession({ username: " aye.chan ", department: "Engineering" }, 5)
    expect(session).toEqual({ username: "aye.chan", department: "Engineering", signedInAt: 5 })
    expect(parseSession(JSON.stringify(session))).toEqual(session)
  })

  test("ignores missing or malformed storage", () => {
    expect(parseSession(null)).toBeUndefined()
    expect(parseSession("not json")).toBeUndefined()
    expect(parseSession('{"username":1}')).toBeUndefined()
  })
})

test("displayName title-cases separators", () => {
  expect(displayName("aye.chan_win")).toBe("Aye Chan Win")
})
