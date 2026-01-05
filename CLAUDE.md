# Claude Code Instructions for Tsyne

Read LLM.md for info about the project/repo

## Building the Go Bridge

**NEVER run `go build` directly in the bridge directory.**

Always use:
```bash
pnpm run build:bridge
```

This builds to `bin/tsyne-bridge` which is where `./scripts/tsyne` looks for it.
Running `go build` directly builds to `bridge/bridge` which is NOT used at runtime.
