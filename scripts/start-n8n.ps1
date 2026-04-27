$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$dataPath = Join-Path $root ".n8n-data"

New-Item -ItemType Directory -Force -Path $dataPath | Out-Null

$env:N8N_USER_FOLDER = $dataPath
$env:N8N_PORT = "5678"
$env:N8N_HOST = "localhost"
$env:N8N_PROTOCOL = "http"
$env:N8N_EDITOR_BASE_URL = "http://localhost:5678"
$env:GENERIC_TIMEZONE = "Asia/Seoul"
$env:N8N_COMMUNITY_PACKAGES_ENABLED = "false"
$env:N8N_VERIFIED_PACKAGES_ENABLED = "false"
$env:N8N_UNVERIFIED_PACKAGES_ENABLED = "false"
$env:N8N_CUSTOM_EXTENSIONS = (Join-Path $dataPath ".n8n\custom")
$env:NODES_INCLUDE = '["n8n-nodes-base.manualTrigger","CUSTOM.pythonAdd"]'

Write-Host "Starting n8n"
Write-Host "Data path: $dataPath"
Write-Host "Editor: http://localhost:5678"
Write-Host "Community nodes: disabled"
Write-Host "Custom nodes: $env:N8N_CUSTOM_EXTENSIONS"
Write-Host "Allowed nodes: $env:NODES_INCLUDE"

& (Join-Path $root "node_modules\.bin\n8n.cmd") start
