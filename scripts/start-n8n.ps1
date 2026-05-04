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
$env:EXTERNAL_FRONTEND_HOOKS_URLS = ""
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

$allowedNodes = @(
    "n8n-nodes-base.manualTrigger",
    "n8n-nodes-base.webhook",
    "n8n-nodes-base.respondToWebhook",
    "n8n-nodes-base.scheduleTrigger",
    "n8n-nodes-base.httpRequest",
    "n8n-nodes-base.set",
    "n8n-nodes-base.code",
    "n8n-nodes-base.merge",
    "n8n-nodes-base.if",
    "n8n-nodes-base.switch",
    "n8n-nodes-base.noOp",
    "n8n-nodes-base.stickyNote",

    # Local/non-SaaS LangChain building blocks.
    "@n8n/n8n-nodes-langchain.agent",
    "@n8n/n8n-nodes-langchain.agentTool",
    "@n8n/n8n-nodes-langchain.chainSummarization",
    "@n8n/n8n-nodes-langchain.chainLlm",
    "@n8n/n8n-nodes-langchain.chainRetrievalQa",
    "@n8n/n8n-nodes-langchain.sentimentAnalysis",
    "@n8n/n8n-nodes-langchain.informationExtractor",
    "@n8n/n8n-nodes-langchain.textClassifier",
    "@n8n/n8n-nodes-langchain.code",
    "@n8n/n8n-nodes-langchain.documentDefaultDataLoader",
    "@n8n/n8n-nodes-langchain.documentBinaryInputLoader",
    "@n8n/n8n-nodes-langchain.documentJsonInputLoader",
    "@n8n/n8n-nodes-langchain.embeddingsLemonade",
    "@n8n/n8n-nodes-langchain.embeddingsOllama",
    "@n8n/n8n-nodes-langchain.lmChatLemonade",
    "@n8n/n8n-nodes-langchain.lmChatOllama",
    "@n8n/n8n-nodes-langchain.lmLemonade",
    "@n8n/n8n-nodes-langchain.lmOllama",
    "@n8n/n8n-nodes-langchain.mcpClient",
    "@n8n/n8n-nodes-langchain.mcpClientTool",
    "@n8n/n8n-nodes-langchain.mcpTrigger",
    "@n8n/n8n-nodes-langchain.memoryBufferWindow",
    "@n8n/n8n-nodes-langchain.memoryManager",
    "@n8n/n8n-nodes-langchain.memoryChatRetriever",
    "@n8n/n8n-nodes-langchain.outputParserAutofixing",
    "@n8n/n8n-nodes-langchain.outputParserItemList",
    "@n8n/n8n-nodes-langchain.outputParserStructured",
    "@n8n/n8n-nodes-langchain.retrieverContextualCompression",
    "@n8n/n8n-nodes-langchain.retrieverVectorStore",
    "@n8n/n8n-nodes-langchain.retrieverMultiQuery",
    "@n8n/n8n-nodes-langchain.retrieverWorkflow",
    "@n8n/n8n-nodes-langchain.textSplitterCharacterTextSplitter",
    "@n8n/n8n-nodes-langchain.textSplitterRecursiveCharacterTextSplitter",
    "@n8n/n8n-nodes-langchain.textSplitterTokenSplitter",
    "@n8n/n8n-nodes-langchain.toolCalculator",
    "@n8n/n8n-nodes-langchain.toolCode",
    "@n8n/n8n-nodes-langchain.toolThink",
    "@n8n/n8n-nodes-langchain.toolVectorStore",
    "@n8n/n8n-nodes-langchain.toolWorkflow",
    "@n8n/n8n-nodes-langchain.manualChatTrigger",
    "@n8n/n8n-nodes-langchain.chatTrigger",
    "@n8n/n8n-nodes-langchain.chat",
    "@n8n/n8n-nodes-langchain.vectorStoreInMemory",
    "@n8n/n8n-nodes-langchain.vectorStoreInMemoryInsert",
    "@n8n/n8n-nodes-langchain.vectorStoreInMemoryLoad",
    "@n8n/n8n-nodes-langchain.toolExecutor",
    "@n8n/n8n-nodes-langchain.modelSelector",
    "@n8n/n8n-nodes-langchain.guardrails",

    "CUSTOM.pythonAdd",
    "CUSTOM.pipelineA",
    "CUSTOM.pipelineB",
    "CUSTOM.pipelineC",
    "CUSTOM.pipelineD",
    "CUSTOM.presetScriptRunner",
    "CUSTOM.ispInput",
    "CUSTOM.ispBlock",
    "CUSTOM.ispScript"
)
$env:NODES_INCLUDE = $allowedNodes | ConvertTo-Json -Compress

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
