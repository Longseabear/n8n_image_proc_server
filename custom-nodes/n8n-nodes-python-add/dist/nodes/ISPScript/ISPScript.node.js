"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.ISPScript = void 0;

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { NodeOperationError } = require("n8n-workflow");

function getWorkspaceRoot() {
	return process.env.N8N_WORKSPACE_ROOT || process.cwd();
}

function getScriptRoot() {
	return path.join(getWorkspaceRoot(), "ISPScript");
}

function listAlgorithms() {
	const scriptRoot = getScriptRoot();
	if (!fs.existsSync(scriptRoot)) {
		return [];
	}

	return fs
		.readdirSync(scriptRoot, { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.filter((entry) => fs.existsSync(path.join(scriptRoot, entry.name, "run.py")))
		.map((entry) => {
			const readmePath = path.join(scriptRoot, entry.name, "README.md");
			const description = fs.existsSync(readmePath)
				? fs.readFileSync(readmePath, "utf8").split(/\r?\n/).find((line) => line.trim()) || entry.name
				: `${entry.name}/run.py`;

			return {
				name: entry.name,
				value: entry.name,
				description,
			};
		});
}

function safeAlgorithmPath(algorithmName) {
	const scriptRoot = getScriptRoot();
	const algorithmPath = path.resolve(scriptRoot, algorithmName);
	if (!algorithmPath.startsWith(scriptRoot)) {
		throw new Error("Algorithm path must stay inside ISPScript workspace");
	}

	const runPath = path.join(algorithmPath, "run.py");
	if (!fs.existsSync(runPath)) {
		throw new Error(`Algorithm ${algorithmName} is missing run.py`);
	}

	return { algorithmPath, runPath };
}

class ISPScript {
	constructor() {
		this.description = {
			displayName: "ISPScript",
			name: "ispScript",
			icon: "fa:terminal",
			group: ["transform"],
			version: 1,
			description: "Runs a selected algorithm from the ISPScript workspace",
			defaults: {
				name: "ISPScript",
			},
			inputs: ["main"],
			outputs: ["main"],
			properties: [
				{
					displayName: "Algorithms are loaded from workspace/ISPScript/*/run.py. Add a folder with run.py to make a new algorithm available.",
					name: "notice",
					type: "notice",
					default: "",
				},
				{
					displayName: "Algorithm Name or ID",
					name: "algorithmName",
					type: "options",
					typeOptions: {
						loadOptionsMethod: "getAlgorithms",
					},
					default: "ScriptA",
					description: "The algorithm folder to run. Choose from the list, or specify an ID using an expression.",
				},
				{
					displayName: "Python Command",
					name: "pythonCommand",
					type: "string",
					default: "python",
				},
				{
					displayName: "Timeout MS",
					name: "timeoutMs",
					type: "number",
					default: 30000,
				},
			],
		};

		this.methods = {
			loadOptions: {
				async getAlgorithms() {
					return listAlgorithms();
				},
			},
		};
	}

	async execute() {
		const items = this.getInputData();
		const returnData = [];

		if (items.length > 1) {
			throw new NodeOperationError(this.getNode(), "ISPScript only supports one item per execution to protect memory.");
		}

		for (let itemIndex = 0; itemIndex < items.length; itemIndex += 1) {
			const algorithmName = this.getNodeParameter("algorithmName", itemIndex);
			const pythonCommand = this.getNodeParameter("pythonCommand", itemIndex);
			const timeoutMs = this.getNodeParameter("timeoutMs", itemIndex);
			let paths;

			try {
				paths = safeAlgorithmPath(algorithmName);
			} catch (error) {
				throw new NodeOperationError(this.getNode(), error.message, { itemIndex });
			}

			const payload = {
				algorithmName,
				json: items[itemIndex].json || {},
				workspaceRoot: getWorkspaceRoot(),
				scriptRoot: getScriptRoot(),
				algorithmPath: paths.algorithmPath,
			};

			const result = spawnSync(pythonCommand, [paths.runPath], {
				input: JSON.stringify(payload),
				encoding: "utf8",
				timeout: timeoutMs,
				cwd: paths.algorithmPath,
				env: {
					...process.env,
					PYTHONUTF8: "1",
					PYTHONIOENCODING: "utf-8",
					PYTHONPATH: [path.join(getScriptRoot(), "_lib"), process.env.PYTHONPATH].filter(Boolean).join(path.delimiter),
					ISP_SCRIPT_ROOT: getScriptRoot(),
				},
			});

			if (result.error) {
				throw new NodeOperationError(this.getNode(), result.error.message, { itemIndex });
			}

			if (result.status !== 0) {
				throw new NodeOperationError(
					this.getNode(),
					`ISPScript ${algorithmName} failed: ${(result.stderr || "").trim() || `exit code ${result.status}`}`,
					{ itemIndex },
				);
			}

			let outputJson;
			try {
				outputJson = result.stdout.trim() ? JSON.parse(result.stdout) : items[itemIndex].json || {};
			} catch (error) {
				throw new NodeOperationError(this.getNode(), `ISPScript must print JSON to stdout: ${error.message}`, {
					itemIndex,
				});
			}

			returnData.push({
				json: outputJson,
				pairedItem: {
					item: itemIndex,
				},
			});
		}

		return [returnData];
	}
}

exports.ISPScript = ISPScript;
