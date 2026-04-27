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

Write-Host "Starting n8n"
Write-Host "Data path: $dataPath"
Write-Host "Editor: http://localhost:5678"

& (Join-Path $root "node_modules\.bin\n8n.cmd") start
