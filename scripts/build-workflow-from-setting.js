const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const settingPath = process.argv[2]
  ? path.resolve(root, process.argv[2])
  : path.join(root, 'workflow-source', 'setting.json');

const nodeKinds = {
  manualTrigger: {
    type: 'n8n-nodes-base.manualTrigger',
    typeVersion: 1,
    parameters: {},
  },
  webhook: {
    type: 'n8n-nodes-base.webhook',
    typeVersion: 2,
    buildParameters(node) {
      return {
        httpMethod: node.httpMethod || 'POST',
        path: node.path || slug(node.name),
        responseMode: node.responseMode || 'onReceived',
        options: node.options || {},
      };
    },
  },
  respondToWebhook: {
    type: 'n8n-nodes-base.respondToWebhook',
    typeVersion: 1,
    buildParameters(node) {
      return {
        respondWith: node.respondWith || 'json',
        responseBody: node.responseBody || '={{ $json }}',
        options: node.options || {},
      };
    },
  },
  scheduleTrigger: {
    type: 'n8n-nodes-base.scheduleTrigger',
    typeVersion: 1.2,
    buildParameters(node) {
      return {
        rule: node.rule || {
          interval: [
            {
              field: node.field || 'minutes',
              minutesInterval: node.minutesInterval || 5,
            },
          ],
        },
      };
    },
  },
  set: {
    type: 'n8n-nodes-base.set',
    typeVersion: 2,
    buildParameters(node) {
      const values = node.values || {};

      return {
        keepOnlySet: node.keepOnlySet !== false,
        values: {
          string: Object.entries(values).map(([name, value]) => ({
            name,
            value: String(value),
          })),
        },
      };
    },
  },
  httpRequest: {
    type: 'n8n-nodes-base.httpRequest',
    typeVersion: 4.2,
    buildParameters(node) {
      return {
        method: node.method || 'GET',
        url: node.url || 'https://example.com',
        sendBody: Boolean(node.body || node.jsonBody),
        contentType: node.contentType || 'json',
        jsonBody: node.jsonBody || (node.body ? JSON.stringify(node.body, null, 2) : undefined),
        options: node.options || {},
      };
    },
  },
  code: {
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    buildParameters(node) {
      return {
        mode: node.mode || 'runOnceForAllItems',
        language: node.language || 'javaScript',
        jsCode: node.jsCode || 'return $input.all();',
      };
    },
  },
  if: {
    type: 'n8n-nodes-base.if',
    typeVersion: 2,
    buildParameters(node) {
      return node.parameters || {
        conditions: node.conditions || {
          options: {
            caseSensitive: true,
            leftValue: '',
            typeValidation: 'strict',
          },
          conditions: [],
          combinator: 'and',
        },
        options: node.options || {},
      };
    },
  },
  switch: {
    type: 'n8n-nodes-base.switch',
    typeVersion: 3,
    buildParameters(node) {
      return node.parameters || {
        rules: node.rules || { values: [] },
        options: node.options || {},
      };
    },
  },
  merge: {
    type: 'n8n-nodes-base.merge',
    typeVersion: 3,
    buildParameters(node) {
      return {
        mode: node.mode || 'append',
      };
    },
  },
  noOp: {
    type: 'n8n-nodes-base.noOp',
    typeVersion: 1,
    parameters: {},
  },
  stickyNote: {
    type: 'n8n-nodes-base.stickyNote',
    typeVersion: 1,
    buildParameters(node) {
      return {
        content: node.content || node.text || '',
        height: node.height || 160,
        width: node.width || 240,
        color: node.color || 1,
      };
    },
  },
  chatTrigger: {
    type: '@n8n/n8n-nodes-langchain.chatTrigger',
    typeVersion: 1.1,
    parameters: {},
  },
  manualChatTrigger: {
    type: '@n8n/n8n-nodes-langchain.manualChatTrigger',
    typeVersion: 1,
    parameters: {},
  },
  chat: {
    type: '@n8n/n8n-nodes-langchain.chat',
    typeVersion: 1,
    buildParameters(node) {
      return node.parameters || {};
    },
  },
  pythonAdd: {
    type: 'CUSTOM.pythonAdd',
    typeVersion: 1,
    buildParameters(node) {
      return {
        a: node.a ?? 1,
        b: node.b ?? 2,
        pythonCommand: node.pythonCommand || 'python',
      };
    },
  },
  pipelineA: {
    type: 'CUSTOM.pipelineA',
    typeVersion: 1,
    parameters: {},
  },
  pipelineB: {
    type: 'CUSTOM.pipelineB',
    typeVersion: 1,
    parameters: {},
  },
  pipelineC: {
    type: 'CUSTOM.pipelineC',
    typeVersion: 1,
    parameters: {},
  },
  pipelineD: {
    type: 'CUSTOM.pipelineD',
    typeVersion: 1,
    parameters: {},
  },
  presetScriptRunner: {
    type: 'CUSTOM.presetScriptRunner',
    typeVersion: 1,
    buildParameters(node) {
      return {
        preset: node.preset || 'append-a.json',
        initialValue: node.initialValue || 'input-',
        pythonCommand: node.pythonCommand || 'python',
      };
    },
  },
  ispInput: {
    type: 'CUSTOM.ispInput',
    typeVersion: 1,
    buildParameters(node) {
      return {
        fileSource: node.fileSource || 'auto',
        mainInputFilesJson: JSON.stringify(node.mainInputFiles || { raw: 'C:/images/input.png' }, null, 2),
        subInputFilesJson: JSON.stringify(node.subInputFiles || {}, null, 2),
      };
    },
  },
  ispBlock: {
    type: 'CUSTOM.ispBlock',
    typeVersion: 1,
    buildParameters(node) {
      return {
        blockName: node.blockName || 'ProcA',
        inputFilesJson: JSON.stringify(node.inputFiles || {}, null, 2),
        outputDirectory: node.outputDirectory || '',
        runProcessor: node.runProcessor !== false,
        pythonCommand: node.pythonCommand || 'python',
        requireInputFiles: Boolean(node.requireInputFiles),
        processorTimeoutMs: node.processorTimeoutMs || 30000,
        includeReadme: node.includeReadme !== false,
      };
    },
  },
  ispScript: {
    type: 'CUSTOM.ispScript',
    typeVersion: 1,
    buildParameters(node) {
      return {
        algorithmName: node.algorithmName || 'ScriptA',
        pythonCommand: node.pythonCommand || 'python',
        timeoutMs: node.timeoutMs || 30000,
      };
    },
  },
};

const localLangChainKinds = [
  'agent',
  'agentTool',
  'chainSummarization',
  'chainLlm',
  'chainRetrievalQa',
  'sentimentAnalysis',
  'informationExtractor',
  'textClassifier',
  'langChainCode',
  'documentDefaultDataLoader',
  'documentBinaryInputLoader',
  'documentJsonInputLoader',
  'embeddingsLemonade',
  'embeddingsOllama',
  'lmChatLemonade',
  'lmChatOllama',
  'lmLemonade',
  'lmOllama',
  'mcpClient',
  'mcpClientTool',
  'mcpTrigger',
  'memoryBufferWindow',
  'memoryManager',
  'memoryChatRetriever',
  'outputParserAutofixing',
  'outputParserItemList',
  'outputParserStructured',
  'retrieverContextualCompression',
  'retrieverVectorStore',
  'retrieverMultiQuery',
  'retrieverWorkflow',
  'textSplitterCharacterTextSplitter',
  'textSplitterRecursiveCharacterTextSplitter',
  'textSplitterTokenSplitter',
  'toolCalculator',
  'toolCode',
  'toolThink',
  'toolVectorStore',
  'toolWorkflow',
  'vectorStoreInMemory',
  'vectorStoreInMemoryInsert',
  'vectorStoreInMemoryLoad',
  'toolExecutor',
  'modelSelector',
  'guardrails',
];

for (const kind of localLangChainKinds) {
  const langChainNodeName = kind === 'langChainCode' ? 'code' : kind;
  nodeKinds[kind] = {
    type: `@n8n/n8n-nodes-langchain.${langChainNodeName}`,
    typeVersion: 1,
    buildParameters(node) {
      return node.parameters || {};
    },
  };
}

const aliases = {
  manual: 'manualTrigger',
  'manual trigger': 'manualTrigger',
  ManualTrigger: 'manualTrigger',
  'Manual Trigger': 'manualTrigger',
  trigger: 'manualTrigger',
  editFields: 'set',
  'Edit Fields': 'set',
  Set: 'set',
  noop: 'noOp',
  NoOp: 'noOp',
  'No Op': 'noOp',
  note: 'stickyNote',
  sticky: 'stickyNote',
  StickyNote: 'stickyNote',
  'Sticky Note': 'stickyNote',
  response: 'respondToWebhook',
  RespondToWebhook: 'respondToWebhook',
  'Respond to Webhook': 'respondToWebhook',
  schedule: 'scheduleTrigger',
  ScheduleTrigger: 'scheduleTrigger',
  'Schedule Trigger': 'scheduleTrigger',
  http: 'httpRequest',
  HttpRequest: 'httpRequest',
  HTTPRequest: 'httpRequest',
  'HTTP Request': 'httpRequest',
  aiAgent: 'agent',
  'AI Agent': 'agent',
  basicLlmChain: 'chainLlm',
  llmChain: 'chainLlm',
  'Basic LLM Chain': 'chainLlm',
  langchainCode: 'langChainCode',
  lcCode: 'langChainCode',
  'LangChain Code': 'langChainCode',
  simpleMemory: 'memoryBufferWindow',
  'Simple Memory': 'memoryBufferWindow',
  ollamaChat: 'lmChatOllama',
  'Ollama Chat': 'lmChatOllama',
  'Ollama Chat Model': 'lmChatOllama',
  ollama: 'lmChatOllama',
  ollamaModel: 'lmOllama',
  'Ollama Model': 'lmOllama',
  ollamaEmbeddings: 'embeddingsOllama',
  'Ollama Embeddings': 'embeddingsOllama',
  lemonadeChat: 'lmChatLemonade',
  'Lemonade Chat': 'lmChatLemonade',
  'Lemonade Chat Model': 'lmChatLemonade',
  lemonadeModel: 'lmLemonade',
  'Lemonade Model': 'lmLemonade',
  lemonadeEmbeddings: 'embeddingsLemonade',
  'Lemonade Embeddings': 'embeddingsLemonade',
  simpleVectorStore: 'vectorStoreInMemory',
  inMemoryVectorStore: 'vectorStoreInMemory',
  'Simple Vector Store': 'vectorStoreInMemory',
  calculatorTool: 'toolCalculator',
  Calculator: 'toolCalculator',
  codeTool: 'toolCode',
  'Code Tool': 'toolCode',
  thinkTool: 'toolThink',
  'Think Tool': 'toolThink',
  workflowTool: 'toolWorkflow',
  'Workflow Tool': 'toolWorkflow',
  structuredOutputParser: 'outputParserStructured',
  'Structured Output Parser': 'outputParserStructured',
  itemListOutputParser: 'outputParserItemList',
  'Item List Output Parser': 'outputParserItemList',
  autofixingOutputParser: 'outputParserAutofixing',
  'Auto-fixing Output Parser': 'outputParserAutofixing',
  ISPInput: 'ispInput',
  'ISP Input': 'ispInput',
  'CUSTOM.ispInput': 'ispInput',
  ISPBlock: 'ispBlock',
  'ISP Block': 'ispBlock',
  'CUSTOM.ispBlock': 'ispBlock',
  ISPScript: 'ispScript',
  'ISP Script': 'ispScript',
  'CUSTOM.ispScript': 'ispScript',
  PythonAdd: 'pythonAdd',
  'Python Add': 'pythonAdd',
  'CUSTOM.pythonAdd': 'pythonAdd',
  PresetScriptRunner: 'presetScriptRunner',
  'Preset Script Runner': 'presetScriptRunner',
  'CUSTOM.presetScriptRunner': 'presetScriptRunner',
};

const lowerAliases = Object.fromEntries(
  Object.entries(aliases).map(([key, value]) => [key.toLowerCase().replace(/\s+/g, ''), value])
);

function normalizeKind(kind) {
  if (aliases[kind]) {
    return aliases[kind];
  }

  const compact = String(kind).toLowerCase().replace(/\s+/g, '');
  return lowerAliases[compact] || kind;
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`Cannot read JSON at ${filePath}: ${error.message}`);
  }
}

function slug(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function buildNode(node, index) {
  if (!node.name) {
    throw new Error(`Node at index ${index} is missing "name".`);
  }

  const requestedKind = node.kind || node.type;
  const kind = normalizeKind(requestedKind);
  const template = nodeKinds[kind];

  if (!template) {
    if (node.type && node.parameters) {
      const x = Number.isFinite(node.x) ? node.x : 260 + index * 260;
      const y = Number.isFinite(node.y) ? node.y : 300;

      return {
        parameters: node.parameters,
        id: node.id || slug(node.name) || `node-${index + 1}`,
        name: node.name,
        type: node.type,
        typeVersion: node.typeVersion || 1,
        position: [x, y],
        ...(node.webhookId ? { webhookId: node.webhookId } : {}),
      };
    }

    throw new Error(
      `Unknown node kind "${kind}" for "${node.name}". Supported kinds: ${Object.keys(nodeKinds).join(', ')}. For unsupported nodes, provide raw "type", "typeVersion", and "parameters".`
    );
  }

  const x = Number.isFinite(node.x) ? node.x : 260 + index * 260;
  const y = Number.isFinite(node.y) ? node.y : 300;
  const parameters = node.parameters || (template.buildParameters ? template.buildParameters(node) : template.parameters);

  return {
    parameters,
    id: node.id || slug(node.name) || `node-${index + 1}`,
    name: node.name,
    type: template.type,
    typeVersion: node.typeVersion || template.typeVersion,
    position: [x, y],
    ...(node.webhookId ? { webhookId: node.webhookId } : {}),
  };
}

function buildConnections(edges) {
  const connections = {};

  for (const edge of edges || []) {
    if (!edge.from || !edge.to) {
      throw new Error('Every connection needs "from" and "to".');
    }

    if (!connections[edge.from]) {
      connections[edge.from] = { main: [] };
    }

    const outputIndex = Number.isFinite(edge.output) ? edge.output : 0;
    const inputIndex = Number.isFinite(edge.input) ? edge.input : 0;

    while (connections[edge.from].main.length <= outputIndex) {
      connections[edge.from].main.push([]);
    }

    connections[edge.from].main[outputIndex].push({
      node: edge.to,
      type: 'main',
      index: inputIndex,
    });
  }

  return connections;
}

function buildWorkflow(setting) {
  if (!Array.isArray(setting.nodes) || setting.nodes.length === 0) {
    throw new Error('setting.json needs at least one node in "nodes".');
  }

  return [
    {
      id: setting.id || slug(setting.name || 'generated-workflow'),
      name: setting.name || 'Generated Workflow',
      nodes: setting.nodes.map(buildNode),
      connections: buildConnections(setting.connections),
      settings: setting.settings || {},
      staticData: null,
      meta: null,
      pinData: {},
      active: Boolean(setting.active),
      tags: setting.tags || [],
    },
  ];
}

function main() {
  const setting = readJson(settingPath);
  const workflow = buildWorkflow(setting);
  const outputPath = path.resolve(root, setting.output || 'exports/generated-workflow.json');

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(workflow, null, 2)}\n`, 'utf8');

  console.log(`Generated ${path.relative(root, outputPath)}`);
}

main();
