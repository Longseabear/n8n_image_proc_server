"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.PresetScriptRunner = void 0;

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { NodeOperationError } = require("n8n-workflow");

function getWorkspaceRoot() {
	return process.env.N8N_WORKSPACE_ROOT || process.cwd();
}

function safeResolve(root, relativePath, label) {
	const resolved = path.resolve(root, relativePath || "");
	if (!resolved.startsWith(root)) {
		throw new Error(`${label} must stay inside workspace root`);
	}
	return resolved;
}

function readPreset(root, presetFile) {
	const presetPath = safeResolve(path.join(root, "presets"), presetFile, "Preset file");
	const preset = JSON.parse(fs.readFileSync(presetPath, "utf8"));

	if (!preset.script) {
		throw new Error(`Preset ${presetFile} is missing "script"`);
	}

	return preset;
}

class PresetScriptRunner {
	constructor() {
		this.description = {
			displayName: "Preset Script Runner",
			name: "presetScriptRunner",
			icon: "fa:play",
			group: ["transform"],
			version: 1,
			description: "Runs a workspace script using a selected preset",
			defaults: {
				name: "Preset Script Runner",
			},
			inputs: ["main"],
			outputs: ["main"],
			properties: [
				{
					displayName: "Preset",
					name: "preset",
					type: "options",
					options: [
						{
							name: "Append A",
							value: "append-a.json",
						},
						{
							name: "Append B",
							value: "append-b.json",
						},
					],
					default: "append-a.json",
					description: "Preset JSON file from the workspace presets folder",
				},
				{
					displayName: "Initial Value",
					name: "initialValue",
					type: "string",
					default: "input-",
					description: "Used when the incoming item has no value field",
				},
				{
					displayName: "Python Command",
					name: "pythonCommand",
					type: "string",
					default: "python",
					description: "Python executable to run",
				},
			],
		};
	}

	async execute() {
		const items = this.getInputData();
		const returnData = [];
		const workspaceRoot = getWorkspaceRoot();

		for (let itemIndex = 0; itemIndex < items.length; itemIndex += 1) {
			const presetFile = this.getNodeParameter("preset", itemIndex);
			const initialValue = this.getNodeParameter("initialValue", itemIndex);
			const pythonCommand = this.getNodeParameter("pythonCommand", itemIndex);

			let preset;
			try {
				preset = readPreset(workspaceRoot, presetFile);
			} catch (error) {
				throw new NodeOperationError(this.getNode(), error.message, { itemIndex });
			}

			const scriptPath = safeResolve(path.join(workspaceRoot, "user-scripts"), preset.script, "Script path");
			const payload = {
				json: {
					...items[itemIndex].json,
					value: items[itemIndex].json.value ?? initialValue,
				},
				preset,
				globals: {
					PIPELINE_GLOBAL_PARAMETER: process.env.PIPELINE_GLOBAL_PARAMETER || "",
				},
			};

			const result = spawnSync(pythonCommand, [scriptPath], {
				input: JSON.stringify(payload),
				encoding: "utf8",
				timeout: preset.timeoutMs || 10000,
			});

			if (result.error) {
				throw new NodeOperationError(this.getNode(), result.error.message, { itemIndex });
			}

			if (result.status !== 0) {
				throw new NodeOperationError(
					this.getNode(),
					`Script failed: ${(result.stderr || "").trim() || `exit code ${result.status}`}`,
					{ itemIndex },
				);
			}

			let outputJson;
			try {
				outputJson = JSON.parse(result.stdout);
			} catch (error) {
				throw new NodeOperationError(this.getNode(), `Script must print JSON to stdout: ${error.message}`, {
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

exports.PresetScriptRunner = PresetScriptRunner;
