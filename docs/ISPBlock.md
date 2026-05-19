# ISPBlock

`ISPBlock` is the local n8n custom node for folder-managed ISP processing blocks.
It discovers blocks from `ISPBlock/*`, lets the workflow select a version folder,
builds main/sub file maps, optionally runs `process.py`, and returns the next
file maps for downstream ISP blocks.

## Folder Layout

Each block is a folder under `ISPBlock/`:

```text
ISPBlock/
  ProcA/
    README.md
    process.py
    block.json
    versions/
      default/
        README.md
        block.json
  ProcB/
    README.md
    process.py
    versions/
      default/
        README.md
        block.json
```

`README.md` is optional. When present, the first non-empty line is used in the
n8n dropdown/notice text. If it is missing, the node shows a non-blocking notice
instead of treating that as an error.

`block.json` is optional at both the block level and version level. The bundled
sample helper can use it to locate a real executable, but custom `process.py`
files may implement their own config loading.

`process.py` is also optional. If `Run process.py` is enabled and the file is
missing, the node skips execution and returns `processingResult.ran = false`.

## Node Parameters

`Block Name or ID` selects the block folder under `ISPBlock/`.

`Version Name or ID` selects a folder under `ISPBlock/<BlockName>/versions/`.
The selected folder must exist. Its name is passed to `process.py` as
`payload.version`.

`Input Files JSON` is the fallback main-input file map used when the incoming
item does not already contain `mainFiles` or `files`.

`Sub Input Files JSON` is the fallback sub-input file map used when the incoming
item does not already contain `subFiles`.

`Output Directory` controls where generated output paths point. Leave it empty
to generate outputs next to the original input file paths.

`Run process.py` controls whether `ISPBlock/<BlockName>/process.py` is executed.

`Python Command` defaults to `python`.

`Require Input Files Exist` is passed through to the processor payload. The
sample processors use it to fail when a source file is missing.

`Processor Timeout MS` limits the `process.py` execution time.

`Include README in Output` adds `blockReadme` to the node output.

## Input Resolution

Main files are resolved in this order:

1. Incoming `json.mainFiles`
2. Incoming `json.files`
3. Node parameter `Input Files JSON`

Sub files are resolved in this order:

1. Incoming `json.subFiles`
2. Node parameter `Sub Input Files JSON`

Both values must be JSON objects shaped as `name -> file path`:

```json
{
  "raw": "C:/images/input.png"
}
```

Example with sub inputs:

```json
{
  "mainFiles": {
    "raw": "C:/images/input.png"
  },
  "subFiles": {
    "calibration": "C:/images/calibration.png"
  }
}
```

`ISPInput` is the preferred upstream node because it initializes `files`,
`mainFiles`, `subFiles`, `originalMainFiles`, and `originalSubFiles`. The direct
JSON fields on `ISPBlock` exist for simple one-node tests and fallback workflows.

## Output Path Rules

For each original main and sub file, `ISPBlock` creates an output path by adding
`_<BlockName>` before the file extension.

Example:

```text
C:/images/input.png -> C:/images/input_ProcA.png
```

When `Output Directory` is set, only the directory changes:

```text
C:/images/input.png + C:/out -> C:/out/input_ProcA.png
```

The output item contains:

- `files` and `mainFiles`: generated main output paths
- `subFiles`: generated sub output paths
- `originalFiles` and `originalMainFiles`: original main inputs
- `originalSubFiles`: original sub inputs
- `lastBlock`: selected block name
- `version`: selected version name
- `globalInput`: parsed `ISPBlock/global.json`
- `processingResult`: `process.py` run result
- `ispHistory`: append-only per-block execution history

## process.py Payload

When enabled, `ISPBlock` runs:

```text
python ISPBlock/<BlockName>/process.py
```

The node writes one JSON payload to stdin:

```json
{
  "blockName": "ProcA",
  "version": "default",
  "inputFiles": {
    "raw": "C:/images/input.png"
  },
  "outputFiles": {
    "raw": "C:/images/input_ProcA.png"
  },
  "originalFiles": {
    "raw": "C:/images/input.png"
  },
  "mainInputFiles": {
    "raw": "C:/images/input.png"
  },
  "subInputFiles": {
    "calibration": "C:/images/calibration.png"
  },
  "outputMainFiles": {
    "raw": "C:/images/input_ProcA.png"
  },
  "outputSubFiles": {
    "calibration": "C:/images/calibration_ProcA.png"
  },
  "originalMainFiles": {
    "raw": "C:/images/input.png"
  },
  "originalSubFiles": {
    "calibration": "C:/images/calibration.png"
  },
  "globalInput": {
    "gain": 1.5,
    "EIT": "eit-demo",
    "TMC": "tmc-demo"
  },
  "options": {
    "requireInputFiles": true,
    "timeoutMs": 30000
  }
}
```

The legacy aliases `inputFiles`, `outputFiles`, and `originalFiles` point to the
main file maps. New processors should prefer the explicit `main*` and `sub*`
fields.

## process.py stdout and Errors

`process.py` may print one JSON object to stdout. The parsed object is returned
as `processingResult.stdout`.

Successful stdout example:

```json
{
  "blockName": "ProcA",
  "version": "default",
  "status": "ok"
}
```

If stdout is empty, the node still succeeds and sets `processingResult.stdout`
to `null`.

The node fails when:

- `process.py` cannot be started
- `process.py` exits with a non-zero code
- stdout is present but is not valid JSON
- stdout JSON contains a truthy `error` field

Error stdout example:

```json
{
  "error": "calibration file missing"
}
```

That output is treated as an n8n node error even if `process.py` exits with code
`0`. Empty, `null`, or `false` `error` values are ignored.

For non-zero exits, `stderr` is used as the error message when available.

## Version block.json

Version folders are discovered from:

```text
ISPBlock/<BlockName>/versions/<VersionName>/
```

`block.json` inside a version folder is optional. If it exists, the dropdown
description says that the version uses that config. If it does not exist, the
version is still selectable and runnable.

The sample `process.py` files use `ISPBlock/_lib/isp_common/exe.py`, which loads
executable config in this order:

1. `ISPBlock/<BlockName>/versions/<VersionName>/block.json`
2. `ISPBlock/<BlockName>/block.json`
3. Built-in mock executable fallback

Minimal executable config:

```json
{
  "executable": "C:/path/to/real-isp.exe",
  "args": [
    "--mode",
    "demo"
  ]
}
```

The token `${ISP_ROOT}` is expanded inside `executable` and `args`.

## Workflow Generator Fields

In `workflow-source/setting.json`, use `kind: "ispBlock"`:

```json
{
  "name": "ISP ProcA",
  "kind": "ispBlock",
  "blockName": "ProcA",
  "version": "default",
  "inputFiles": {
    "raw": "C:/images/input.png"
  },
  "subInputFiles": {
    "calibration": "C:/images/calibration.png"
  },
  "outputDirectory": "C:/images/out",
  "runProcessor": true,
  "pythonCommand": "python",
  "requireInputFiles": true,
  "processorTimeoutMs": 30000,
  "includeReadme": true
}
```

The generator serializes `inputFiles` into the node's `Input Files JSON` field
and `subInputFiles` into `Sub Input Files JSON`.

## Local Verification

Run the harness after changing ISP nodes or processors:

```powershell
npm run harness
```

The harness covers:

- main/sub input propagation through `ISPInput` and `ISPBlock`
- `Sub Input Files JSON` fallback behavior
- selected versions without `block.json`
- stdout JSON `error` handling
- ProcA/ProcB file-list propagation
