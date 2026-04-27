$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$dataPath = Join-Path $root ".n8n-data"
$n8nHome = Join-Path $dataPath ".n8n"
$customPath = Join-Path $n8nHome "custom"
$packagePath = Join-Path $root "custom-nodes\n8n-nodes-python-add"

New-Item -ItemType Directory -Force -Path $customPath | Out-Null

if (-not (Test-Path (Join-Path $customPath "package.json"))) {
    Push-Location $customPath
    npm init -y | Out-Null
    Pop-Location
}

Push-Location $customPath
npm install --force $packagePath
Pop-Location

Write-Host "Installed custom nodes into $customPath"
