"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
process.env.N8N_WORKSPACE_ROOT = root;
process.env.PIPELINE_GLOBAL_PARAMETER = "harness-global";

const failures = [];

function pass(message) {
	console.log(`PASS ${message}`);
}

function fail(message, error) {
	const detail = error && error.stack ? error.stack : String(error || "");
	failures.push(`${message}${detail ? `\n${detail}` : ""}`);
	console.error(`FAIL ${message}`);
	if (detail) {
		console.error(detail);
	}
}

function assert(condition, message) {
	if (!condition) {
		throw new Error(message);
	}
}

function readJson(relativePath) {
	return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function createContext({ items = [{ json: {} }], params = {} } = {}) {
	return {
		getInputData() {
			return items;
		},
		getNodeParameter(name, itemIndex) {
			const value = params[name];
			if (Array.isArray(value)) {
				return value[itemIndex] ?? value[0];
			}
			return value;
		},
		getNode() {
			return {
				name: "Harness Node",
				type: "harness.node",
			};
		},
	};
}

async function executeNode(NodeClass, options) {
	const node = new NodeClass();
	return node.execute.call(createContext(options));
}

async function testJsonFiles() {
	const jsonFiles = [
		"custom-nodes/n8n-nodes-python-add/package.json",
		"examples/two-node-starter.json",
		"examples/four-node-branch-merge.json",
		"examples/pipeline-abcd-global.json",
		"examples/preset-script-runner.json",
		"examples/isp-workflow.json",
		"ISPBlock/global.json",
		"presets/append-a.json",
		"presets/append-b.json",
	];

	for (const file of jsonFiles) {
		readJson(file);
	}

	pass("JSON files parse");
}

async function testCustomNodePackage() {
	const pkg = readJson("custom-nodes/n8n-nodes-python-add/package.json");
	assert(Array.isArray(pkg.n8n.nodes), "package n8n.nodes must be an array");

	for (const nodePath of pkg.n8n.nodes) {
		const fullPath = path.join(root, "custom-nodes/n8n-nodes-python-add", nodePath);
		assert(fs.existsSync(fullPath), `registered node file missing: ${nodePath}`);
		const mod = require(fullPath);
		const exportNames = Object.keys(mod);
		assert(exportNames.length > 0, `registered node has no exports: ${nodePath}`);
		const instance = new mod[exportNames[0]]();
		assert(instance.description && instance.description.displayName, `node missing description: ${nodePath}`);
	}

	pass("custom node package registrations load");
}

async function testISPManualAndWebhookFlow() {
	const { ISPInput } = require("../custom-nodes/n8n-nodes-python-add/dist/nodes/ISPInput/ISPInput.node.js");
	const { ISPBlock } = require("../custom-nodes/n8n-nodes-python-add/dist/nodes/ISPBlock/ISPBlock.node.js");

	const manualInput = await executeNode(ISPInput, {
		items: [{ json: {} }],
		params: {
			fileSource: "auto",
			inputFilesJson: '{ "raw": "C:/images/input.png" }',
		},
	});
	const manualItem = manualInput[0][0];
	assert(manualItem.json.files.raw === "C:/images/input.png", "manual ISPInput should create files.raw");
	assert(manualItem.json.originalFiles.raw === "C:/images/input.png", "manual ISPInput should create originalFiles.raw");

	const webhookInput = await executeNode(ISPInput, {
		items: [{ json: { body: { files: { raw: "C:/images/webhook.png" } } } }],
		params: {
			fileSource: "auto",
			inputFilesJson: '{ "raw": "C:/images/fallback.png" }',
		},
	});
	assert(webhookInput[0][0].json.files.raw === "C:/images/webhook.png", "ISPInput should prefer webhook body.files");

	const procA = await executeNode(ISPBlock, {
		items: [manualItem],
		params: {
			blockName: "ProcA",
			inputFilesJson: "{}",
			outputDirectory: "",
			includeReadme: true,
		},
	});
	const procAItem = procA[0][0];
	assert(procAItem.json.files.raw.replace(/\\/g, "/") === "C:/images/input_ProcA.png", "ProcA output path mismatch");
	assert(procAItem.json.globalInput.gain === 1.5, "ISPBlock should read shared global gain");
	assert(procAItem.json.blockReadme.includes("ProcA"), "ProcA README should be included in output");

	const procB = await executeNode(ISPBlock, {
		items: [procAItem],
		params: {
			blockName: "ProcB",
			inputFilesJson: "{}",
			outputDirectory: "",
			includeReadme: true,
		},
	});
	const procBItem = procB[0][0];
	assert(procBItem.json.files.raw.replace(/\\/g, "/") === "C:/images/input_ProcB.png", "ProcB output path mismatch");
	assert(
		procBItem.json.ispHistory[1].inputFiles.raw.replace(/\\/g, "/") === "C:/images/input_ProcA.png",
		"ProcB history should record ProcA output as input",
	);

	pass("ISPInput and ISPBlock manual/webhook flow");
}

async function testPresetScriptRunner() {
	const {
		PresetScriptRunner,
	} = require("../custom-nodes/n8n-nodes-python-add/dist/nodes/PresetScriptRunner/PresetScriptRunner.node.js");

	const result = await executeNode(PresetScriptRunner, {
		items: [{ json: { value: "input-" } }],
		params: {
			preset: "append-a.json",
			initialValue: "",
			pythonCommand: "python",
		},
	});

	assert(result[0][0].json.value === "input-A", "Preset Script Runner should append A");
	assert(result[0][0].json.globalParameter === "harness-global", "Preset Script Runner should pass global parameter");
	pass("Preset Script Runner executes user script");
}

async function testPythonAdd() {
	const { PythonAdd } = require("../custom-nodes/n8n-nodes-python-add/dist/nodes/PythonAdd/PythonAdd.node.js");

	const result = await executeNode(PythonAdd, {
		items: [{ json: {} }],
		params: {
			a: 3,
			b: 4,
			pythonCommand: "python",
		},
	});

	assert(result[0][0].json.sum === 7, "PythonAdd should return sum 7");
	pass("Python Add executes Python");
}

async function testWorkflowShape() {
	const workflow = readJson("examples/isp-workflow.json")[0];
	const nodesByName = Object.fromEntries(workflow.nodes.map((node) => [node.name, node]));

	assert(nodesByName.Start, "ISP workflow should have Manual Trigger");
	assert(nodesByName["Webhook ISP"], "ISP workflow should have Webhook trigger");
	assert(nodesByName["ISP Input"], "ISP workflow should have ISP Input");
	assert(nodesByName["ISP ProcA"], "ISP workflow should have ISP ProcA");
	assert(nodesByName["ISP ProcB"], "ISP workflow should have ISP ProcB");
	assert(workflow.connections.Start.main[0][0].node === "ISP Input", "Manual Trigger should connect to ISP Input");
	assert(workflow.connections["Webhook ISP"].main[0][0].node === "ISP Input", "Webhook should connect to ISP Input");
	assert(workflow.connections["ISP Input"].main[0][0].node === "ISP ProcA", "ISP Input should connect to ProcA");
	assert(workflow.connections["ISP ProcA"].main[0][0].node === "ISP ProcB", "ProcA should connect to ProcB");

	const startScript = fs.readFileSync(path.join(root, "scripts/start-n8n.ps1"), "utf8");
	for (const required of [
		"n8n-nodes-base.webhook",
		"n8n-nodes-base.code",
		"n8n-nodes-base.merge",
		"CUSTOM.ispInput",
		"CUSTOM.ispBlock",
	]) {
		assert(startScript.includes(required), `start script should allow ${required}`);
	}

	pass("ISP workflow shape and allowed nodes");
}

async function main() {
	const tests = [
		testJsonFiles,
		testCustomNodePackage,
		testISPManualAndWebhookFlow,
		testPresetScriptRunner,
		testPythonAdd,
		testWorkflowShape,
	];

	for (const test of tests) {
		try {
			await test();
		} catch (error) {
			fail(test.name, error);
		}
	}

	if (failures.length > 0) {
		console.error(`\n${failures.length} harness check(s) failed.`);
		process.exit(1);
	}

	console.log("\nAll harness checks passed.");
}

main();
