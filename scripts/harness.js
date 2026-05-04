"use strict";

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

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
		"examples/isp-script-workflow.json",
		"ISPBlock/global.json",
		"ISPBlock/ProcA/versions/default/block.json",
		"ISPBlock/ProcB/versions/default/block.json",
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
	const tmpDir = path.join(root, "exports", "harness");
	const inputPath = path.join(tmpDir, "input.png");
	const subInputPath = path.join(tmpDir, "calibration.png");
	fs.mkdirSync(tmpDir, { recursive: true });
	fs.writeFileSync(inputPath, "not-a-real-image-but-valid-file-for-copy-tests", "utf8");
	fs.writeFileSync(subInputPath, "not-a-real-calibration-file", "utf8");

	const manualInput = await executeNode(ISPInput, {
		items: [{ json: {} }],
		params: {
			fileSource: "auto",
			mainInputFilesJson: JSON.stringify({ raw: inputPath }),
			subInputFilesJson: JSON.stringify({ calibration: subInputPath }),
		},
	});
	const manualItem = manualInput[0][0];
	assert(manualItem.json.files.raw === inputPath, "manual ISPInput should create files.raw");
	assert(manualItem.json.mainFiles.raw === inputPath, "manual ISPInput should create mainFiles.raw");
	assert(manualItem.json.subFiles.calibration === subInputPath, "manual ISPInput should create subFiles.calibration");
	assert(manualItem.json.originalMainFiles.raw === inputPath, "manual ISPInput should create originalMainFiles.raw");
	assert(
		manualItem.json.originalSubFiles.calibration === subInputPath,
		"manual ISPInput should create originalSubFiles.calibration",
	);

	const webhookInput = await executeNode(ISPInput, {
		items: [{ json: { body: { mainFiles: { raw: "C:/images/webhook.png" }, subFiles: { calibration: "C:/images/cal.png" } } } }],
		params: {
			fileSource: "auto",
			inputFilesJson: '{ "raw": "C:/images/fallback.png" }',
		},
	});
	assert(webhookInput[0][0].json.files.raw === "C:/images/webhook.png", "ISPInput should prefer webhook body.files");
	assert(
		webhookInput[0][0].json.subFiles.calibration === "C:/images/cal.png",
		"ISPInput should prefer webhook body.subFiles",
	);

	const procA = await executeNode(ISPBlock, {
		items: [manualItem],
		params: {
			blockName: "ProcA",
			version: "default",
			inputFilesJson: "{}",
			outputDirectory: tmpDir,
			runProcessor: true,
			pythonCommand: "python",
			requireInputFiles: true,
			processorTimeoutMs: 30000,
			includeReadme: true,
		},
	});
	const procAItem = procA[0][0];
	const expectedProcAPath = path.join(tmpDir, "input_ProcA.png");
	const expectedProcASubPath = path.join(tmpDir, "calibration_ProcA.png");
	assert(procAItem.json.files.raw === expectedProcAPath, "ProcA output path mismatch");
	assert(procAItem.json.mainFiles.raw === expectedProcAPath, "ProcA mainFiles output path mismatch");
	assert(procAItem.json.subFiles.calibration === expectedProcASubPath, "ProcA subFiles output path mismatch");
	assert(fs.existsSync(expectedProcAPath), "ProcA should create output file");
	assert(fs.existsSync(expectedProcASubPath), "ProcA should create sub output file");
	assert(procAItem.json.globalInput.gain === 1.5, "ISPBlock should read shared global gain");
	assert(procAItem.json.version === "default", "ProcA should expose selected version");
	assert(procAItem.json.processingResult.stdout.version === "default", "ProcA process.py should receive version");
	assert(procAItem.json.ispHistory[0].version === "default", "ProcA history should record version");
	assert(procAItem.json.blockReadme.includes("ProcA"), "ProcA README should be included in output");
	assert(procAItem.json.processingResult.ran === true, "ProcA process.py should run");

	const procB = await executeNode(ISPBlock, {
		items: [procAItem],
		params: {
			blockName: "ProcB",
			version: "default",
			inputFilesJson: "{}",
			outputDirectory: tmpDir,
			runProcessor: true,
			pythonCommand: "python",
			requireInputFiles: true,
			processorTimeoutMs: 30000,
			includeReadme: true,
		},
	});
	const procBItem = procB[0][0];
	const expectedProcBPath = path.join(tmpDir, "input_ProcB.png");
	const expectedProcBSubPath = path.join(tmpDir, "calibration_ProcB.png");
	assert(procBItem.json.files.raw === expectedProcBPath, "ProcB output path mismatch");
	assert(procBItem.json.subFiles.calibration === expectedProcBSubPath, "ProcB subFiles output path mismatch");
	assert(fs.existsSync(expectedProcBPath), "ProcB should create output file");
	assert(fs.existsSync(expectedProcBSubPath), "ProcB should create sub output file");
	assert(
		procBItem.json.ispHistory[1].mainInputFiles.raw === expectedProcAPath,
		"ProcB history should record ProcA output as input",
	);
	assert(
		procBItem.json.ispHistory[1].subInputFiles.calibration === expectedProcASubPath,
		"ProcB history should record ProcA sub output as input",
	);
	assert(procBItem.json.processingResult.ran === true, "ProcB process.py should run");
	assert(procBItem.json.ispHistory[1].version === "default", "ProcB history should record version");

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

async function testISPScript() {
	const { ISPScript } = require("../custom-nodes/n8n-nodes-python-add/dist/nodes/ISPScript/ISPScript.node.js");
	const node = new ISPScript();
	const algorithms = await node.methods.loadOptions.getAlgorithms();
	assert(algorithms.some((algorithm) => algorithm.value === "ScriptA"), "ISPScript should list ScriptA");
	assert(algorithms.some((algorithm) => algorithm.value === "ScriptB"), "ISPScript should list ScriptB");
	assert(algorithms.some((algorithm) => algorithm.value === "ScriptC"), "ISPScript should list ScriptC");

	const scriptA = await executeNode(ISPScript, {
		items: [{ json: { value: "seed" } }],
		params: {
			algorithmName: "ScriptA",
			pythonCommand: "python",
			timeoutMs: 30000,
		},
	});
	assert(scriptA[0][0].json.lastISPScript === "ScriptA", "ISPScript should execute ScriptA");

	const scriptB = await executeNode(ISPScript, {
		items: [scriptA[0][0]],
		params: {
			algorithmName: "ScriptB",
			pythonCommand: "python",
			timeoutMs: 30000,
		},
	});
	assert(scriptB[0][0].json.lastISPScript === "ScriptB", "ISPScript should execute ScriptB");
	assert(scriptB[0][0].json.ispScripts.join(",") === "ScriptA,ScriptB", "ISPScript should preserve script history");

	pass("ISPScript discovers and executes algorithms");
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
		"n8n-nodes-base.respondToWebhook",
		"n8n-nodes-base.scheduleTrigger",
		"n8n-nodes-base.httpRequest",
		"n8n-nodes-base.code",
		"n8n-nodes-base.merge",
		"CUSTOM.ispInput",
		"CUSTOM.ispBlock",
		"CUSTOM.ispScript",
		"N8N_CONCURRENCY_PRODUCTION_LIMIT",
	]) {
		assert(startScript.includes(required), `start script should allow ${required}`);
	}

	pass("ISP workflow shape and allowed nodes");
}

async function testWorkflowGeneratorCommonNodes() {
	const tmpDir = path.join(root, "exports", "harness");
	const settingPath = path.join(tmpDir, "generator-setting.json");
	const outputPath = path.join(tmpDir, "generator-workflow.json");
	fs.mkdirSync(tmpDir, { recursive: true });
	fs.writeFileSync(
		settingPath,
		JSON.stringify(
			{
				name: "Harness Generated Workflow",
				output: "exports/harness/generator-workflow.json",
				nodes: [
					{
						name: "Webhook In",
						kind: "webhook",
						path: "harness-webhook",
						responseMode: "responseNode",
					},
					{
						name: "Respond",
						kind: "respondToWebhook",
					},
					{
						name: "Ollama Chat",
						kind: "ollamaChat",
					},
					{
						name: "Simple Memory",
						kind: "simpleMemory",
					},
					{
						name: "ISP Input Alias",
						kind: "ISPInput",
					},
					{
						name: "ISPInput",
						kind: "custom_node",
					},
					{
						name: "ISP Input Package Alias",
						kind: "n8n-nodes-python-add.ISPInput",
					},
					{
						name: "Raw Passthrough",
						type: "n8n-nodes-base.noOp",
						typeVersion: 1,
						parameters: {},
					},
				],
				connections: [
					{
						from: "Webhook In",
						to: "Respond",
					},
					{
						from: "Respond",
						to: "Ollama Chat",
					},
					{
						from: "Ollama Chat",
						to: "Simple Memory",
					},
					{
						from: "Simple Memory",
						to: "ISP Input Alias",
					},
					{
						from: "ISP Input Alias",
						to: "ISPInput",
					},
					{
						from: "ISPInput",
						to: "ISP Input Package Alias",
					},
					{
						from: "ISP Input Package Alias",
						to: "Raw Passthrough",
					},
				],
			},
			null,
			2,
		),
		"utf8",
	);

	execFileSync(process.execPath, ["scripts/build-workflow-from-setting.js", "exports/harness/generator-setting.json"], {
		cwd: root,
		stdio: "pipe",
	});

	const workflow = JSON.parse(fs.readFileSync(outputPath, "utf8"))[0];
	const nodesByName = Object.fromEntries(workflow.nodes.map((node) => [node.name, node]));
	assert(nodesByName["Webhook In"].type === "n8n-nodes-base.webhook", "generator should support webhook");
	assert(
		nodesByName.Respond.type === "n8n-nodes-base.respondToWebhook",
		"generator should support respondToWebhook",
	);
	assert(
		nodesByName["Ollama Chat"].type === "@n8n/n8n-nodes-langchain.lmChatOllama",
		"generator should support Ollama LangChain aliases",
	);
	assert(
		nodesByName["Simple Memory"].type === "@n8n/n8n-nodes-langchain.memoryBufferWindow",
		"generator should support local LangChain memory aliases",
	);
	assert(nodesByName["ISP Input Alias"].type === "CUSTOM.ispInput", "generator should support ISPInput alias");
	assert(nodesByName.ISPInput.type === "CUSTOM.ispInput", "generator should infer custom_node from node name");
	assert(
		nodesByName["ISP Input Package Alias"].type === "CUSTOM.ispInput",
		"generator should support package-style custom node alias",
	);
	assert(nodesByName["Raw Passthrough"].type === "n8n-nodes-base.noOp", "generator should support raw node JSON");
	assert(
		workflow.connections["Webhook In"].main[0][0].node === "Respond",
		"generated webhook should connect to response node",
	);

	pass("workflow generator common nodes and raw fallback");
}

async function main() {
	const tests = [
		testJsonFiles,
		testCustomNodePackage,
		testISPManualAndWebhookFlow,
		testPresetScriptRunner,
		testPythonAdd,
		testISPScript,
		testWorkflowShape,
		testWorkflowGeneratorCommonNodes,
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
