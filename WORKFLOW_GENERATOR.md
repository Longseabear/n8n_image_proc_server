# Workflow Generator

`workflow-source/setting.json` controls a small local generator that turns a simple workspace file into an n8n importable workflow.

Run:

```powershell
npm run build:workflow
```

The default output is:

```text
exports/generated-workflow.json
```

Import that JSON file from the n8n editor.

Or generate and import it into the local n8n database in one step:

```powershell
npm run sync:workflow
```

## setting.json shape

- `name`: workflow name
- `output`: generated workflow path
- `nodes`: node list
- `connections`: links between node names

Supported `kind` values:

- `manualTrigger`
- `set`
- `code`
- `merge`

Example:

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

For unsupported n8n nodes, add raw n8n `parameters` later or extend `scripts/build-workflow-from-setting.js` with another `kind`.
