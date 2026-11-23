import { Button } from "@opencode-ai/ui/button"
import { TextField } from "@opencode-ai/ui/text-field"
import { createSignal, For, Show, type ParentProps } from "solid-js"
import {
  createSession,
  DEPARTMENTS,
  displayName,
  readSession,
  validateLogin,
  writeSession,
} from "@/utils/login-session"

// Private build: on unless VITE_LOGIN_SCREEN=false.
const enabled = import.meta.env.VITE_LOGIN_SCREEN !== "false"

const [session, setSession] = createSignal(readSession())

export function LoginGate(props: ParentProps) {
  return (
    <Show when={!enabled || session()} fallback={<LoginScreen />}>
      {props.children}
      <Show when={enabled}>
        <UserChip />
      </Show>
    </Show>
  )
}

function LoginScreen() {
  const [username, setUsername] = createSignal("")
  const [password, setPassword] = createSignal("")
  const [department, setDepartment] = createSignal<string>(DEPARTMENTS[0])
  const [error, setError] = createSignal<string>()

  const submit = (event: SubmitEvent) => {
    event.preventDefault()
    const input = { username: username(), password: password(), department: department() }
    const problem = validateLogin(input)
    setError(problem)
    if (problem) return
    const next = createSession(input)
    writeSession(next)
    setSession(next)
  }

  return (
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-background-base p-6">
      <div class="w-full max-w-[400px] rounded-xl border border-border-weak-base p-8 flex flex-col gap-6">
        <div class="flex flex-col gap-1">
          <div class="text-24-medium text-text-strong tracking-wide">MINTHU</div>
          <div class="text-14-regular text-text-weak">Sign in with your company account</div>
        </div>
        <form onSubmit={submit} class="flex flex-col gap-4">
          <TextField label="Employee ID or username" value={username()} onChange={setUsername} autofocus />
          <TextField label="Password" type="password" value={password()} onChange={setPassword} />
          <label class="flex flex-col gap-1.5">
            <span class="text-12-medium text-text-weak">Department</span>
            <select
              class="h-9 rounded-md border border-border-weak-base bg-background-base px-2 text-14-regular text-text-strong"
              value={department()}
              onChange={(event) => setDepartment(event.currentTarget.value)}
            >
              <For each={DEPARTMENTS}>{(item) => <option value={item}>{item}</option>}</For>
            </select>
          </label>
          <Show when={error()}>
            <div role="alert" class="text-13-regular" style={{ color: "var(--icon-critical-base)" }}>
              {error()}
            </div>
          </Show>
          <Button type="submit" size="large" variant="primary">
            Sign in
          </Button>
        </form>
        <div class="text-12-regular text-text-weak">
          Credentials are not verified, and nothing is sent or stored except your username and department.
        </div>
      </div>
    </div>
  )
}

function UserChip() {
  const signOut = () => {
    writeSession(undefined)
    setSession(undefined)
  }

  return (
    <Show when={session()}>
      {(current) => (
        <div class="fixed bottom-3 right-3 z-40 flex items-center gap-3 rounded-lg border border-border-weak-base bg-background-base px-3 py-1.5">
          <div class="flex flex-col leading-tight">
            <span class="text-13-medium text-text-strong">{displayName(current().username)}</span>
            <span class="text-12-regular text-text-weak">{current().department}</span>
          </div>
          <Button size="small" variant="ghost" onClick={signOut}>
            Sign out
          </Button>
        </div>
      )}
    </Show>
  )
}
