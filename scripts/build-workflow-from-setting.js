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
  merge: {
    type: 'n8n-nodes-base.merge',
    typeVersion: 3,
    buildParameters(node) {
      return {
        mode: node.mode || 'append',
      };
    },
  },
};

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

  const kind = node.kind || node.type;
  const template = nodeKinds[kind];

  if (!template) {
    throw new Error(
      `Unknown node kind "${kind}" for "${node.name}". Supported kinds: ${Object.keys(nodeKinds).join(', ')}`
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
    typeVersion: template.typeVersion,
    position: [x, y],
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
