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
$env:N8N_DIAGNOSTICS_ENABLED = "false"
$env:N8N_DIAGNOSTICS_CONFIG_FRONTEND = ""
$env:N8N_DIAGNOSTICS_CONFIG_BACKEND = ""
$env:N8N_DIAGNOSTICS_POSTHOG_API_KEY = ""
$env:N8N_DIAGNOSTICS_POSTHOG_API_HOST = ""
$env:N8N_VERSION_NOTIFICATIONS_ENABLED = "false"
$env:N8N_VERSION_NOTIFICATIONS_WHATS_NEW_ENABLED = "false"
$env:N8N_TEMPLATES_ENABLED = "false"
$env:N8N_DYNAMIC_BANNERS_ENABLED = "false"
$env:N8N_HIRING_BANNER_ENABLED = "false"
$env:N8N_PERSONALIZATION_ENABLED = "false"
$env:N8N_LICENSE_AUTO_RENEW_ENABLED = "false"
$env:N8N_CUSTOM_EXTENSIONS = (Join-Path $dataPath ".n8n\custom")
$env:N8N_WORKSPACE_ROOT = $root
$env:N8N_CONCURRENCY_PRODUCTION_LIMIT = "1"
$env:PIPELINE_GLOBAL_PARAMETER = "global-from-start-script"
$env:NODES_INCLUDE = '["n8n-nodes-base.manualTrigger","n8n-nodes-base.webhook","n8n-nodes-base.set","n8n-nodes-base.code","n8n-nodes-base.merge","n8n-nodes-base.if","n8n-nodes-base.switch","n8n-nodes-base.noOp","n8n-nodes-base.stickyNote","@n8n/n8n-nodes-langchain.chatTrigger","@n8n/n8n-nodes-langchain.manualChatTrigger","@n8n/n8n-nodes-langchain.chat","CUSTOM.pythonAdd","CUSTOM.pipelineA","CUSTOM.pipelineB","CUSTOM.pipelineC","CUSTOM.pipelineD","CUSTOM.presetScriptRunner","CUSTOM.ispInput","CUSTOM.ispBlock","CUSTOM.ispScript"]'

Write-Host "Starting n8n"
Write-Host "Data path: $dataPath"
Write-Host "Editor: http://localhost:5678"
Write-Host "Community nodes: disabled"
Write-Host "External diagnostics/templates/banners: disabled"
Write-Host "Custom nodes: $env:N8N_CUSTOM_EXTENSIONS"
Write-Host "Workspace root: $env:N8N_WORKSPACE_ROOT"
Write-Host "Production concurrency limit: $env:N8N_CONCURRENCY_PRODUCTION_LIMIT"
Write-Host "Pipeline global parameter: $env:PIPELINE_GLOBAL_PARAMETER"
Write-Host "Allowed nodes: $env:NODES_INCLUDE"

& (Join-Path $root "node_modules\.bin\n8n.cmd") start
