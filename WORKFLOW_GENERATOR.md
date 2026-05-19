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
- `webhook`
- `respondToWebhook`
- `scheduleTrigger`
- `set`
- `httpRequest`
- `code`
- `if`
- `switch`
- `merge`
- `noOp`
- `stickyNote`
- `chatTrigger`
- `manualChatTrigger`
- `chat`
- `agent`
- `agentTool`
- `chainSummarization`
- `chainLlm`
- `chainRetrievalQa`
- `sentimentAnalysis`
- `informationExtractor`
- `textClassifier`
- `langChainCode`
- `documentDefaultDataLoader`
- `documentBinaryInputLoader`
- `documentJsonInputLoader`
- `embeddingsLemonade`
- `embeddingsOllama`
- `lmChatLemonade`
- `lmChatOllama`
- `lmLemonade`
- `lmOllama`
- `mcpClient`
- `mcpClientTool`
- `mcpTrigger`
- `memoryBufferWindow`
- `memoryManager`
- `memoryChatRetriever`
- `outputParserAutofixing`
- `outputParserItemList`
- `outputParserStructured`
- `retrieverContextualCompression`
- `retrieverVectorStore`
- `retrieverMultiQuery`
- `retrieverWorkflow`
- `textSplitterCharacterTextSplitter`
- `textSplitterRecursiveCharacterTextSplitter`
- `textSplitterTokenSplitter`
- `toolCalculator`
- `toolCode`
- `toolThink`
- `toolVectorStore`
- `toolWorkflow`
- `vectorStoreInMemory`
- `vectorStoreInMemoryInsert`
- `vectorStoreInMemoryLoad`
- `toolExecutor`
- `modelSelector`
- `guardrails`
- `pythonAdd`
- `pipelineA`
- `pipelineB`
- `pipelineC`
- `pipelineD`
- `presetScriptRunner`
- `ispInput`
- `ispBlock`
- `ispScript`

Aliases:

- `manual` and `trigger` use `manualTrigger`
- `editFields` uses `set`
- `http` uses `httpRequest`
- `schedule` uses `scheduleTrigger`
- `response` uses `respondToWebhook`
- `noop` uses `noOp`
- `note` and `sticky` use `stickyNote`
- `aiAgent` uses `agent`
- `basicLlmChain` and `llmChain` use `chainLlm`
- `langchainCode` and `lcCode` use `langChainCode`
- `simpleMemory` uses `memoryBufferWindow`
- `ollama`, `ollamaChat`, `ollamaModel`, and `ollamaEmbeddings` use the local Ollama nodes
- `lemonadeChat`, `lemonadeModel`, and `lemonadeEmbeddings` use the local Lemonade nodes
- `simpleVectorStore` and `inMemoryVectorStore` use `vectorStoreInMemory`

If a node is not supported as a shortcut yet, provide raw n8n fields:

```json
{
  "name": "Raw Node",
  "type": "n8n-nodes-base.someNode",
  "typeVersion": 1,
  "parameters": {}
}
```

Raw mode lets the workflow build continue while keeping the exact n8n parameters you copied from an exported workflow.

## ISPInput and ISPBlock

`ispInput` accepts these shortcut fields:

- `fileSource`: `auto`, `inputJson`, or `parameter`
- `mainInputFiles`: object serialized into `Main Input Files JSON`
- `subInputFiles`: object serialized into `Sub Input Files JSON`

`ispBlock` accepts these shortcut fields:

- `blockName`: block folder under `ISPBlock/`
- `version`: folder under `ISPBlock/<BlockName>/versions/`
- `inputFiles`: object serialized into `Input Files JSON`
- `subInputFiles`: object serialized into `Sub Input Files JSON`
- `outputDirectory`
- `runProcessor`
- `pythonCommand`
- `requireInputFiles`
- `processorTimeoutMs`
- `includeReadme`

Example:

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

See `docs/ISPBlock.md` for the runtime payload, output shape, version config, and stdout error rules.

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
