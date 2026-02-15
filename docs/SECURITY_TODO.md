# Security: App Containment Model

Tsyne apps run in two modes with different trust levels:

| Mode | Launch method | Trust | Bridge access |
|------|--------------|-------|---------------|
| **Standalone** | `./scripts/tsyne myapp.ts` | Full | Real `App`, real bridge |
| **Contained** | Desktop/PhoneTop launcher | Sandboxed | `SandboxedApp`, scoped context |

The goal: standalone apps have full power (they're the OS-level process owner),
while contained apps are isolated from each other as if they were separate processes.

## Current State (Feb 2026)

### Done

- **Widget ID registry scoped per Context** — `withId('status')` registers in the
  app's own `ScopedContext`, not a global map. Two chess games can both use
  `withId('status')` without collision. (`context.ts`, `base.ts`)

- **Reactive bindings scoped per Context** — `registerBinding()` stores bindings
  on the Context, not a module-level `Set`. `a.refreshBindings()` only triggers
  the calling app's bindings. (`context.ts`, `base.ts`, all widget files)

- **`a.refreshBindings()` is an App method** — not a free function import.
  Apps call `this.a.refreshBindings('status')` which looks up IDs in the app's
  own scoped registry. No cross-app ID resolution possible.

- **SandboxedApp hides dangerous APIs** — `getBridge()` not exposed,
  `getContext()` returns scoped context, preferences are key-prefixed,
  widget IDs are scope-prefixed. (`sandboxed-app.ts`)

- **Desktop uses SandboxedApp** — each launched app gets
  `new SandboxedApp(realApp, appScope)` with a unique scope like `chess-1`.
  (`desktop_launch.ts`)

### Remaining Work

#### P0: Active containment gaps

- [ ] **PhoneTop passes real App** — `launchers/phonetop/index.ts` line 1593 passes
  `this.a` directly instead of a `SandboxedApp`. All phone apps run with full
  bridge access. Fix: create `SandboxedApp` in PhoneTop's `launchApp()` method,
  same pattern as desktop.

- [ ] **Free function exports still available** — `refreshAllBindings` and
  `clearAllBindings` are exported from `tsyne`. In standalone mode this is fine.
  In contained mode, an app could `import { refreshAllBindings } from 'tsyne'`
  and bypass scoping. Fix: either remove from exports or make them no-ops
  when a containment flag is set.

- [ ] **Module-level `require('tsyne')` gives full API** — any contained app can
  `import { App } from 'tsyne'` and access the class. It can't construct a
  useful instance without a bridge, but it can access static methods and
  other exports. This is inherent to sharing a Node.js process.

#### P1: Bridge-level enforcement

- [ ] **Bridge has no scope enforcement** — `bridge.send('setText', { widgetId })`
  accepts any widget ID. The Go side trusts all commands equally. A contained
  app that somehow obtains the bridge (or guesses widget IDs) can manipulate
  any widget. Fix: bridge proxy that validates scope prefix on all widget IDs.

- [ ] **Widget IDs are guessable** — format is `scope:_type_random6` where random
  is `Math.random().toString(36).slice(2,8)`. Not cryptographically secure.
  V8's xorshift128+ PRNG state is recoverable from observed outputs.
  Fix: use `crypto.randomBytes()` for contained mode, or enforce scope
  checking on the bridge proxy so guessing doesn't help.

- [ ] **Event listeners are global** — `bridge.on('event', handler)` receives
  events from all widgets. A contained app could listen to another app's
  keystrokes or click events. Fix: scope event routing in the bridge proxy.

- [ ] **`bridge.quit()` kills everything** — any app with bridge access can
  terminate the entire process. Fix: bridge proxy blocks `quit` from
  contained apps.

#### P2: Process isolation (isolated-vm)

- [ ] **`sandbox-runtime.ts`** — implement V8 isolate-based sandboxing using
  `isolated-vm`. Each contained app runs in its own isolate with:
  - Own heap (no shared globals, no shared `require()`)
  - Own PRNG state (widget IDs unobservable from other isolates)
  - Proxy bridge as the only communication channel
  - Explicit allowlist of available modules (e.g., `chess.js` but not `fs`)

- [ ] **Bridge proxy** — the critical security component. Runs in the host
  isolate (trusted) and mediates all bridge commands for contained apps:
  - Validates widget ID prefix matches caller's scope
  - Blocks dangerous commands (`quit`, unscoped preferences, `closeWindow`
    on foreign windows)
  - Routes events only to the owning app's isolate
  - Rate-limits or audits suspicious command patterns

- [ ] **Module allowlisting** — contained apps should only access explicitly
  approved npm packages. `fs`, `net`, `child_process`, `http` must be blocked.
  `isolated-vm` provides this naturally since isolates have no Node.js built-ins.

- [ ] **Resource isolation** — `ScopedResourceManager` already prefixes resource
  names. With isolated-vm, also enforce that apps can't register resources
  with another app's prefix.

#### P3: Future hardening

- [ ] **Capability-based API** — instead of `SandboxedApp` being a filtered
  mirror of `App`, define explicit capability tokens. An app that needs
  file access gets a `FileCapability` injected; one that doesn't, doesn't.
  The `@tsyne-app:args` metadata already declares what an app needs.

- [ ] **Audit logging** — log all bridge commands from contained apps for
  post-hoc analysis. Useful for detecting misbehaving apps during development.

- [ ] **Memory/CPU limits** — `isolated-vm` supports memory limits per isolate.
  Set reasonable defaults to prevent a contained app from exhausting resources.

- [ ] **Content Security Policy** — for apps that render HTML/web content,
  enforce CSP headers to prevent XSS and data exfiltration.

## Design Principles

1. **The App object is the capability root.** Everything an app can do flows
   through `a.method()`. No free functions give power beyond what the App
   provides. Standalone apps get `App`; contained apps get `SandboxedApp`.

2. **Convention now, enforcement later.** `SandboxedApp` prevents accidental
   cross-app interference today. `isolated-vm` will prevent intentional
   escape tomorrow. The API boundary is the same in both cases.

3. **Scoping follows Context.** Widget IDs, reactive bindings, and preferences
   are all scoped per `Context`. `ScopedContext` inherits from `Context` with
   its own registries. This is the single isolation primitive on the JS side.

4. **The bridge proxy is the security boundary.** Once isolated-vm is in place,
   the proxy bridge is the only channel between an app and the outside world.
   All enforcement happens there.
