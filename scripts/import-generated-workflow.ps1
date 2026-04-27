$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$dataPath = Join-Path $root ".n8n-data"
$workflowPath = Join-Path $root "exports\generated-workflow.json"
$n8n = Join-Path $root "node_modules\.bin\n8n.cmd"

if (-not (Test-Path $workflowPath)) {
    throw "Generated workflow not found: $workflowPath. Run npm run build:workflow first."
}

$env:N8N_USER_FOLDER = $dataPath

Write-Host "Importing generated workflow"
Write-Host "Data path: $dataPath"
Write-Host "Workflow: $workflowPath"

& $n8n import:workflow --input=$workflowPath
