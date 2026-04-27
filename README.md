# n8n Image Proc Server

Local n8n starter workspace with a small workflow generator.

This repo is set up to:

- run n8n locally at `http://localhost:5678`
- keep n8n runtime data inside `.n8n-data/`
- load a local `Python Add` custom node
- generate importable n8n workflow JSON from `workflow-source/setting.json`

## Requirements

- Node.js `20.19` through `24.x`
- npm
- PowerShell on Windows

This workspace was tested with Node.js `22.22.0` and n8n `2.15.0`.

## Install

```powershell
npm install
```

## Run n8n

Install local custom nodes first:

```powershell
npm run install:custom-nodes
```

```powershell
npm start
```

Then open:

```text
http://localhost:5678
```

Recent n8n versions require login. On first launch, create the owner account in the browser.

The node panel is limited to:

- `Manual Trigger`
- `Python Add`
- `Pipeline A`
- `Pipeline B`
- `Pipeline C`
- `Pipeline D`
- `Preset Script Runner`
- `ISPInput`
- `ISPBlock`

`Python Add` takes `A` and `B`, runs a small Python calculation, and outputs `sum`.

The pipeline nodes form a simple `A -> B -> C -> D` demo. Each node reads `value`, prints the input in the n8n server log, appends its own letter, and outputs the next `value`. All pipeline nodes read the shared `PIPELINE_GLOBAL_PARAMETER` value from `scripts/start-n8n.ps1`.

An importable example is available at:

```text
examples/pipeline-abcd-global.json
```

`Preset Script Runner` demonstrates a preset-driven node. The node UI exposes a preset dropdown, while the actual behavior is stored in workspace files:

```text
presets/append-a.json
presets/append-b.json
user-scripts/append_text.py
```

An importable example is available at:

```text
examples/preset-script-runner.json
```

`ISPInput` creates the initial file list placeholder. `ISPBlock` demonstrates a folder-managed image-processing block. Blocks live under:

```text
ISPBlock/ProcA/README.md
ISPBlock/ProcB/README.md
```

`ISPBlock` exposes a dropdown populated from `ISPBlock/*` folders and shows the block README content in the node UI. Shared ISP parameters live in one file:

```text
ISPBlock/global.json
```

Edit that file once to update `gain`, `EIT`, and `TMC` for every `ISPBlock` node. For now, `ProcA` and `ProcB` do not process image bytes; they return output paths as the original image name plus the selected block name.

An importable example is available at:

```text
examples/isp-workflow.json
```

## Generate A Workflow From Setting

Edit:

```text
workflow-source/setting.json
```

Then run:

```powershell
npm run build:workflow
```

The generated workflow is written to:

```text
exports/generated-workflow.json
```

Import that file from the n8n editor.

To generate and import it into the local n8n database in one step:

```powershell
npm run sync:workflow
```

## Supported Generated Node Kinds

The generator currently supports:

- `manualTrigger`
- `set`
- `code`
- `merge`

Example `workflow-source/setting.json`:

```json
{
  "name": "Generated From Setting",
  "output": "exports/generated-workflow.json",
  "nodes": [
    {
      "id": "start",
      "name": "Start",
      "kind": "manualTrigger"
    },
    {
      "id": "message",
      "name": "Show Message",
      "kind": "set",
      "values": {
        "message": "hello"
      }
    }
  ],
  "connections": [
    {
      "from": "Start",
      "to": "Show Message"
    }
  ]
}
```

For more details, see `WORKFLOW_GENERATOR.md`.

## Included Examples

- `examples/two-node-starter.json`
- `examples/four-node-branch-merge.json`

These are importable n8n workflow examples.

## Local Data

The following are intentionally ignored by git:

- `node_modules/`
- `.n8n-data/`
- `logs/`
- local n8n log and pid files
- `.env` files
