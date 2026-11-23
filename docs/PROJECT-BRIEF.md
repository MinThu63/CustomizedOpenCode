# MINTHU: Project Brief

A self-contained brief for prototyping, reviewing, or extending this project with an AI assistant.
Status labels: **Built** (works today), **Designed** (agreed on paper, not coded), **Planned** (idea only).

---

## 1. One-paragraph summary

MINTHU is an internal, privacy-first desktop AI coding and work assistant for company employees. It is a
customized fork of the open-source OpenCode agent (MIT license). It runs without contacting OpenCode's hosted
services, adds a company-style sign-in, lets employees teach the agent reusable "skills" that are saved and shared
by person, department, or company, and can drive a real browser to do web tasks. It is also a portfolio project:
the goal is a credible, working internal-tool prototype, not a production deployment.

## 2. The point (why this exists)

- Companies want AI agents but hesitate to send work through public, third-party services.
- Employees in different departments repeat the same prompts and procedures. That know-how stays in their heads or in
  chat history.
- Generic AI tools do not feel like "the company's tool": no sign-in, no department context, no shared knowledge.

MINTHU answers these with three ideas:
1. **Private by default**: no automatic calls to upstream services. Only the model providers the company configures are used.
2. **Company identity**: employees sign in with department context.
3. **Shared know-how**: skills employees write become reusable, searchable, and callable by `/name`.

## 3. Audience

- **Primary:** employees across departments (Engineering, Finance, Human Resources, IT Support, Marketing, Operations).
- **Secondary:** hiring managers and reviewers looking at the repository and screenshots.
- **Builder:** one developer (the author), working on Windows.

## 4. Scope

### In scope (prototype)
- Desktop app (Electron) that runs on Windows.
- Company sign-in screen with department selection (credentials are not verified).
- Skills library: create, browse, search, edit, delete, and call skills with `/`.
- Skill visibility: only me, my department, whole company.
- Offline/private mode: upstream network features off by default.
- Optional browser control (experimental).

### Out of scope (for now)
- Real authentication, SSO, passwords, or access enforcement. The sign-in does not verify credentials.
- A central server or database for sharing across machines. Sharing uses a shared folder at most.
- Billing, analytics, admin dashboards, multi-tenant hosting.
- Mobile apps, macOS/Linux packaging polish.
- Translations. The UI additions are English only.

## 5. Current state

| Area | Status | Notes |
| --- | --- | --- |
| Rebrand to "MINTHU" | Built | Own app name, icons, app ID `ai.minthu.desktop`, data dir `minthu`; isolated from any installed OpenCode. |
| Privacy mode | Built | Auto-update, session sharing, models catalog, changelog fetch, UI proxy from `app.opencode.ai`, and language-server downloads are off by default. |
| Sign-in screen | Built | `packages/app/src/components/login-gate.tsx`, logic and tests in `packages/app/src/utils/login-session.ts`. Username, password (never stored), department. Chip with Sign out at bottom right. Env `VITE_LOGIN_SCREEN=false` disables it. |
| `disableStream` provider option | Built | `packages/opencode/src/provider/disable-stream.ts` plus tests. For OpenAI-compatible endpoints that cannot stream. |
| Browser control | Built, **insecure** | `browser-control/`: Chrome extension, Bun relay on port 8790, about 25 tools. The relay has no auth and listens on all interfaces. Must be fixed before real use. |
| Skills library UI | Built elsewhere | Shown in screenshots; source not in this repo yet. Spec in section 7. |
| Slash-call for skills | Mostly exists | The app's `/` menu already supports a `skill` source. |
| Windows local build | Built | Unsigned unpacked `dir` build; output folder `packages/desktop/build-app/`. |

## 6. Tech stack (verified from the repo)

- Monorepo: Bun workspaces, Turborepo. Default branch in the upstream repo is `dev`; this fork's branch is `main`.
- Language: TypeScript. Effect library for services and schemas.
- Desktop shell: Electron (`packages/desktop`), built with electron-vite and electron-builder.
- UI: SolidJS (`packages/app`), shared components in `packages/ui` (Button, TextField, theme tokens). Styling uses utility classes and CSS variables such as `--background-base`, `--border-weak-base`, `--text-strong`.
- Agent runtime and CLI: `packages/opencode`. Shared core services: `packages/core`.
- Tests: `bun test`, run from inside a package directory, never from the repo root. Typecheck with `bun typecheck` from a package directory.
- Code style rules (from `AGENTS.md`): no `any`, no import aliases or star imports, early returns instead of `else`, avoid `try`/`catch`, prefer `const`, use Effect Schema for parsing JSON.

## 7. Feature spec: Skills library (Designed)

### 7.1 Concept
A skill is a reusable instruction set the agent can follow. In this codebase a skill is a folder containing
`SKILL.md` (front matter with `name` and `description`, then instructions). The app already discovers skills from
`.opencode/skills/` and from extra folder paths set in config (`skills.paths`).

### 7.2 Ownership and visibility
Skills are saved **per person**, with department and company as sharing levels.

| Visible to | Who sees it | Folder |
| --- | --- | --- |
| Only me | author | `skills/people/<username>/<skill>/SKILL.md` |
| My department | author's department | `skills/departments/<dept>/<skill>/SKILL.md` |
| Whole company | everyone | `skills/company/<skill>/SKILL.md` |

- Every skill records its author (front matter field `author`) and department.
- Authors can edit and delete only their own skills. Others are read-only.
- Promoting a skill (changing "Visible to") copies the folder to the shared location.
- Visibility is a label, not a lock. The sign-in screen cannot enforce access.

### 7.3 Screens
1. **Skills library** (new "Skills" item in the sidebar next to Sessions and Settings)
   - Header: title, subtitle, **Add skill** button.
   - Search box and filter chips: My department, All company, Mine.
   - Card grid. Each card: skill name, one-line description, department badge, author, last updated, favourite star.
   - A dashed "Teach the agent something new" tile at the end.
   - Each card has a **Use** button that opens a new prompt with `/skill-name` prefilled.
2. **Add skill** dialog
   - Fields: Name, What it does, Instructions (multi-line), Department (defaults to the signed-in user's), Visible to.
   - Buttons: Cancel, Save skill. Validate that name is a lowercase slug and instructions are not empty.
3. **Edit** uses the same dialog, and **Delete** asks for confirmation. Both are only shown on the author's own skills.

### 7.4 Calling a skill with `/`
- Typing `/` in the prompt lists built-in commands and skills the user can see, each with a "Skill" badge.
- Typing more letters filters the list.
- If two people have the same skill name, show the author, e.g. `/code-review-checklist (Aye Chan)`. Department-prefix naming for clashes is an open question.
- Open check: whether new skill folders are picked up while the app runs or only at startup. If startup only, refresh the skill list on save.

### 7.5 Data model (per skill)
```
name: code-review-checklist          # slug, unique per author
description: One line shown on cards and in the / menu
author: aye.chan_win
department: Engineering
visibility: person | department | company
updated: 2026-11-18
---
Markdown instructions the agent follows.
```
Favourites are per user and stored separately (local storage).

### 7.6 Sample data for screenshots
code-review-checklist, release-notes-writer, incident-postmortem (Engineering); plus one or two each for Finance and
Human Resources. Use made-up names. Do not use real people or company data.

## 8. Benefits

- **Privacy:** work stays on the employee's machine and the company's chosen model endpoints.
- **Consistency:** the department's best procedures become one-command shortcuts.
- **Onboarding:** new hires browse existing skills instead of asking around.
- **Low lock-in:** skills are plain Markdown files that work with the open-source agent.
- **Portfolio value:** shows product thinking, security awareness, and full-stack delivery on a real codebase.

## 9. Risks and honest limits

- The sign-in does not verify credentials. Present it as a sign-in screen, never as security.
- Sharing between computers needs a shared folder or a server that does not exist yet.
- Browser control can drive a logged-in browser. It must get authentication, a localhost-only bind, an origin check,
  a domain allowlist, and approval prompts before anyone but the author uses it.
- Based on third-party open source. Keep `LICENSE` and credits. The OpenCode name and logos may be trademarked, so
  keep the MINTHU branding and avoid using upstream logos in a public build.
- The Windows pre-push typecheck fails because of a checked-out symlink (`packages/enterprise/src/custom-elements.d.ts`).
  This is unrelated to the project's own code.

## 10. Roadmap (suggested order)

1. Secure browser control: bind to `127.0.0.1`, shared secret, WebSocket origin check.
2. Build the Skills library (sections 7.1 to 7.6), with sample data.
3. Approval layer for browser control: domain allowlist, confirm before submit, purchase, or delete, replayable action log.
4. Department-aware defaults: per-department model or tool permissions tied to the login.
5. Local model setup (Ollama, LM Studio) to fit the privacy theme.
6. Provider and cost dashboard.
7. README animated preview (GIF) and screenshots; small evaluation suite for browser tasks.

## 11. How to build it: instructions for an AI assistant

When prototyping from this brief:
- Start from the existing code. Do not rewrite the app. Add new files next to the closest existing ones, and keep edits
  to existing files small (the sign-in gate only touches `packages/app/src/app.tsx` by 3 lines).
- Reuse `@opencode-ai/ui` components and theme CSS variables so new screens match the app in light and dark themes.
- Check file line endings before editing; several files use CRLF.
- Put pure logic in a small module with tests (see `login-session.ts` and `login-session.test.ts` for the pattern).
- Verify visually: run `bun run dev` in `packages/app` (serves on port 3000), open it in a browser, and screenshot.
- Do not commit secrets. Do not add network calls to public services.
- Run tests and typecheck from the package directory, not the repo root.

## 12. Repo map (the parts that matter)

| Path | Purpose |
| --- | --- |
| `packages/app` | SolidJS web UI; the sign-in gate lives here |
| `packages/desktop` | Electron shell, build config, icons |
| `packages/opencode` | agent runtime, providers, skills loading |
| `packages/core` | shared services, global paths, models catalog gate |
| `packages/ui` | shared components and theme |
| `browser-control/` | Chrome extension, relay server, agent tools |
| `scripts/gen-icons.py` | builds the app icon set from one image |
