<div align="center">

<img src="docs/logo.png" alt="MINTHU logo" width="120" />

# MINTHU

**OpenCode, rebuilt for company use: private by default, signed-in by department, extended with browser control.**

![Electron](https://img.shields.io/badge/Electron-42-47848F?logo=electron&logoColor=white)
![SolidJS](https://img.shields.io/badge/SolidJS-1.9-2C4F7C?logo=solid&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)
![Bun](https://img.shields.io/badge/Bun-1.3-000000?logo=bun&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-green)

<img src="docs/screenshots/login-dark.png" alt="MINTHU sign-in screen" width="720" />

</div>

> This repo holds **only my additions** plus one patch for my edits to upstream files.
> The base is [OpenCode](https://github.com/anomalyco/opencode) (MIT). It is not a full fork.

---

## MINTHU vs OpenCode

**Same agent core. Different defaults, identity, and reach.**

| | OpenCode (base) | MINTHU |
| --- | --- | --- |
| **Network by default** | Update checks, session sharing, model catalog fetch, changelog fetch, web UI proxy, language-server downloads are on | **All off.** Opt back in per feature with flags |
| **Who is using it** | Anonymous single user | **Company sign-in** with department, user chip, sign out |
| **Models** | Built-in catalog of providers | **You choose.** Only providers you configure appear |
| **Endpoints that can't stream** | No option to turn streaming off | **`disableStream` option** replays a normal reply as a stream |
| **Browser** | Not in the repo | **Real-Chrome control**: extension, relay, 20+ tools *(experimental)* |
| **Office output** | Not in the repo | **Proposal-deck skill**: rough idea to 9-slide `.pptx` |
| **Install identity** | Shares app ID and data folder with every OpenCode install | **Own name, icons, app ID, data folder.** Runs side by side |

**What that buys a company**
- Work goes only to the model endpoints it configures.
- Every session starts with a known user and department.
- One patch file shows exactly what changed, so security review is quick.

**Where it is *not* better**
- Same agent engine, tools, and model support as OpenCode. It does not add capability there.
- No built-in model list, so setup is manual.
- The sign-in screen does not verify credentials, and browser control has no authentication yet.

---

## Table of contents

- [MINTHU vs OpenCode](#minthu-vs-opencode)
- [Motivation](#motivation)
- [Features](#features)
- [Architecture](#architecture)
- [Project structure](#project-structure)
- [Technical highlights](#technical-highlights)
- [Getting started](#getting-started)
- [Screenshots](#screenshots)
- [Roadmap](#roadmap)
- [License](#license)

---

## Motivation

- Companies want AI agents, but not their work flowing through public services.
- Teams repeat the same prompts and procedures.
- Generic tools don't feel like *the company's* tool.

**Goal:** a private-by-default agent with company sign-in and shareable know-how.

---

## Features

| Feature | What it does |
| --- | --- |
| **Private by default** | Auto-update, session sharing, models catalog, changelog fetch, hosted web UI proxy and language-server downloads are off. |
| **Company sign-in** | Username, password and department. Credentials are not verified; the password is never stored. |
| **User chip + sign out** | Shows name and department; sign out returns to the sign-in screen. |
| **Browser control** *(experimental)* | Chrome extension + local relay + 20+ tools so the agent can navigate, read, click, fill and screenshot. |
| **`disableStream` option** | Makes OpenAI-compatible endpoints that can't stream work with this agent. |
| **Proposal-deck skill** | Turns a rough idea into a 9-slide `.pptx` with speaker notes. |
| **Isolated identity** | Own name, icons, app ID and data folder, separate from any installed OpenCode. |
| **Windows local build** | Unsigned unpacked build for dev machines; signed installer only in CI. |

---

## Architecture

```mermaid
flowchart LR
    U([Employee]) --> L[Sign-in gate]
    L --> UI[SolidJS UI]
    subgraph Desktop[Electron shell]
        UI
    end
    UI --> RT[OpenCode agent runtime]
    RT --> P[(Configured model providers)]
    RT --> SK[Skills]
    RT --> BC[Browser-control tools]
    BC -->|HTTP :8790| RL[Relay server]
    RL -->|WebSocket| EX[Chrome extension]
    EX --> CH[Chrome tab]
```

- The sign-in gate wraps the app; it runs before any server connection.
- Browser control is a separate process pair (relay + extension).
- Upstream network features are switched off by flags and small edits.

---

## Project structure

```text
.
├── browser-control/        # Chrome extension, relay server, agent tools
│   ├── extension/          #   MV3 service worker (the "hands")
│   ├── server/             #   Bun relay on port 8790
│   └── tools/              #   one file per agent tool
├── src/                    # New source files, at their OpenCode paths
│   └── packages/
│       ├── app/            #   sign-in gate + session logic + tests
│       └── opencode/       #   disableStream provider wrapper + tests
├── patches/                # My edits to upstream files, as one patch
├── skills/                 # Proposal-deck skill (third-party, MIT)
├── scripts/gen-icons.py    # Builds the icon set from one image
└── docs/                   # Screenshots, logo, full project brief
```

---

## Technical highlights

- **Small surface area:** the sign-in gate touches upstream with 3 lines in `app.tsx`; everything else is new files.
- **Typed, tested logic:** session code and `disableStream` are pure modules with unit tests (no `any`, schema-parsed JSON).
- **Stream shim:** `disableStream` sends `stream: false`, then replays the reply as one SSE `chat.completion.chunk` so the SDK's parser stays happy. Upstream errors pass through untouched.
- **Safe storage:** only username and department are saved; the password never is.
- **Offline-first defaults:** flags flip upstream features from opt-out to opt-in.
- **Reviewable customization:** one patch file shows every upstream edit.

---

## Getting started

Needs [Bun](https://bun.sh) and Git. This repo applies *on top of* OpenCode:

```bash
git clone https://github.com/anomalyco/opencode.git
cd opencode
git checkout 03e67171ab                       # the commit this was built on
git apply /path/to/this-repo/patches/minthu-customizations.patch
cp -r /path/to/this-repo/src/packages/. packages/
cp -r /path/to/this-repo/browser-control .
cp -r /path/to/this-repo/skills/project-proposal-slides .opencode/skills/
bun install
bun dev:desktop
```

Run the tests from inside the package directory:

```bash
cd packages/opencode && bun test test/provider/disable-stream.test.ts
cd packages/app && bun test --conditions=solid --preload ./happydom.ts src/utils/login-session.test.ts
```

Browser control (experimental): run `bun run start` in `browser-control/server`, then load
`browser-control/extension` as an unpacked extension in Chrome.

Turn the sign-in screen off with `VITE_LOGIN_SCREEN=false`.

---

## Screenshots

Captured from the web build with fake data (user "Aye Chan", Engineering). The signed-in
view uses a seeded session and shows the empty state. A debug bar from the app's dev tools
was painted over.

| | |
| :---: | :---: |
| <img src="docs/screenshots/login-dark.png" alt="Sign-in, dark" /> | <img src="docs/screenshots/login-light.png" alt="Sign-in, light" /> |
| Sign-in (dark) | Sign-in (light) |
| <img src="docs/screenshots/login-validation.png" alt="Validation error" /> | <img src="docs/screenshots/home-dark.png" alt="Home, dark" /> |
| Validation error | Signed in (dark) |
| <img src="docs/screenshots/home-light.png" alt="Home, light" /> | |
| Signed in (light) | |

---

## Roadmap

- [ ] **Secure browser control**: localhost-only bind, shared secret, origin check
- [ ] **Skills library**: per-person skills shared to department or company, called with `/`
- [ ] **Approval layer**: domain allowlist, confirm before submit or delete, action log
- [ ] Department-aware defaults tied to sign-in
- [ ] Local model setup (Ollama, LM Studio)
- [ ] Animated preview (GIF)

Known limits: the sign-in does not verify credentials; browser control has no authentication yet.
Full spec in [`docs/PROJECT-BRIEF.md`](docs/PROJECT-BRIEF.md).

---

## License

MIT. Based on [OpenCode](https://github.com/anomalyco/opencode), copyright its contributors;
see [`LICENSE`](LICENSE). The proposal-deck skill keeps its original authors' credit in
`skills/project-proposal-slides/SKILL.md`.
