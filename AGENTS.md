# n8n Local Starter

This folder is a minimal local starter for n8n.

## Goal

- Run n8n locally.
- Open the editor at `http://localhost:5678`.
- Keep n8n data inside this workspace.

## Files

- `package.json`
  - local n8n dependency and npm scripts
- `scripts/start-n8n.ps1`
  - local startup script
- `examples/two-node-starter.json`
  - starter workflow with 2 connected nodes
- `examples/four-node-branch-merge.json`
  - branch and merge example with Node A, B, C, D
- `.n8n-data/`
  - local n8n user folder, SQLite database, and settings

## Run

```powershell
.\scripts\start-n8n.ps1
```

Then open:

```text
http://localhost:5678
```

## Login

n8n also requires login on recent versions.

On first launch, n8n shows a signup screen so you can create the owner account in the browser.

There is no supported no-login mode in recent n8n versions.

## Notes

- Installed version: `n8n 2.15.0`
- Official npm docs currently list `2.15.0` as stable.
- Official docs say supported Node.js versions are `20.19` through `24.x`.
- This workspace uses Node `22.22.0`, which is supported.
- Starter example uses 2 nodes:
  - `Start` (`Manual Trigger`)
  - `Show Message` (`Set`)
- Branch example uses:
  - `Node A`: returns `"1"` and `"2"`
  - `Node B`: prints the first result from `Node A`
  - `Node C`: prints the second result from `Node A`
  - `Node D`: receives inputs from `Node B` and `Node C` and outputs both
