param(
    [string]$InputPath = "exports\generated-workflow.json",
    [switch]$Separate
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$dataPath = Join-Path $root ".n8n-data"
$workflowPath = if ([System.IO.Path]::IsPathRooted($InputPath)) {
    $InputPath
} else {
    Join-Path $root $InputPath
}
$n8n = Join-Path $root "node_modules\.bin\n8n.cmd"

if (-not (Test-Path $workflowPath)) {
    throw "Workflow import input not found: $workflowPath"
}

$env:N8N_USER_FOLDER = $dataPath

Write-Host "Importing workflow export"
Write-Host "Data path: $dataPath"
Write-Host "Input: $workflowPath"

if ($Separate) {
    & $n8n import:workflow --separate --input=$workflowPath
} else {
    & $n8n import:workflow --input=$workflowPath
}
