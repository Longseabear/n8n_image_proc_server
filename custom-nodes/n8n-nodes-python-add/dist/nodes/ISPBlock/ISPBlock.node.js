"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.ISPBlock = void 0;

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { NodeOperationError } = require("n8n-workflow");

function getWorkspaceRoot() {
	return process.env.N8N_WORKSPACE_ROOT || process.cwd();
}

function getIspRoot() {
	return path.join(getWorkspaceRoot(), "ISPBlock");
}

function listBlocks() {
	const ispRoot = getIspRoot();
	if (!fs.existsSync(ispRoot)) {
		return [];
	}

	return fs
		.readdirSync(ispRoot, { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.map((entry) => {
			const readmePath = path.join(ispRoot, entry.name, "README.md");
			const description = fs.existsSync(readmePath)
				? fs.readFileSync(readmePath, "utf8").split(/\r?\n/).find((line) => line.trim()) || entry.name
				: entry.name;

			return {
				name: entry.name,
				value: entry.name,
				description,
			};
		});
}

function listVersions(blockName) {
	const versionsRoot = path.join(getIspRoot(), blockName || "", "versions");
	if (!fs.existsSync(versionsRoot)) {
		return [];
	}

	return fs
		.readdirSync(versionsRoot, { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.map((entry) => {
			const readmePath = path.join(versionsRoot, entry.name, "README.md");
			const blockConfigPath = path.join(versionsRoot, entry.name, "block.json");
			const description = fs.existsSync(readmePath)
				? fs.readFileSync(readmePath, "utf8").split(/\r?\n/).find((line) => line.trim()) || entry.name
				: fs.existsSync(blockConfigPath)
					? `${entry.name}/block.json`
					: entry.name;

			return {
				name: entry.name,
				value: entry.name,
				description,
			};
		});
}

function readGlobalInput() {
	const globalPath = path.join(getIspRoot(), "global.json");
	if (!fs.existsSync(globalPath)) {
		return {};
	}

	return JSON.parse(fs.readFileSync(globalPath, "utf8"));
}

function buildReadmeNotice() {
	const blocks = listBlocks();
	if (blocks.length === 0) {
		return "No ISP blocks found. Add folders under workspace/ISPBlock.";
	}

	return blocks
		.map((block) => {
			const readmePath = path.join(getIspRoot(), block.value, "README.md");
			const readme = fs.existsSync(readmePath) ? fs.readFileSync(readmePath, "utf8").trim() : "README.md not found.";
			return `<b>${block.value}</b><br><pre>${readme}</pre>`;
		})
		.join("<br><br>");
}

function safeParseJson(value, fallback, label) {
	if (typeof value !== "string" || value.trim() === "") {
		return fallback;
	}

	try {
		return JSON.parse(value);
	} catch (error) {
		throw new Error(`${label} must be valid JSON: ${error.message}`);
	}
}

function normalizeFileMap(fileMap) {
	if (!fileMap || typeof fileMap !== "object" || Array.isArray(fileMap)) {
		throw new Error("Input files must be a JSON object, for example {\"raw\":\"C:/images/raw.png\"}");
	}

	return fileMap;
}

function makeOutputPath(inputPath, blockName, outputDirectory) {
	const parsed = path.parse(String(inputPath));
	const outputName = `${parsed.name}_${blockName}${parsed.ext}`;
	return outputDirectory ? path.join(outputDirectory, outputName) : path.join(parsed.dir, outputName);
}

function runProcessorScript({
	blockPath,
	blockName,
	version,
	versionPath,
	mainFiles,
	subFiles,
	outputMainFiles,
	outputSubFiles,
	originalMainFiles,
	originalSubFiles,
	globalInput,
	options,
	pythonCommand,
}) {
	const scriptPath = path.join(blockPath, "process.py");
	if (!fs.existsSync(scriptPath)) {
		return {
			ran: false,
			reason: "process.py not found",
		};
	}

	const payload = {
		blockName,
		version,
		versionPath,
		inputFiles: mainFiles,
		outputFiles: outputMainFiles,
		originalFiles: originalMainFiles,
		mainInputFiles: mainFiles,
		subInputFiles: subFiles,
		outputMainFiles,
		outputSubFiles,
		originalMainFiles,
		originalSubFiles,
		globalInput,
		options,
	};

	for (const outputPath of [...Object.values(outputMainFiles), ...Object.values(outputSubFiles)]) {
		const outputDirectory = path.dirname(String(outputPath));
		if (outputDirectory) {
			fs.mkdirSync(outputDirectory, { recursive: true });
		}
	}

	const result = spawnSync(pythonCommand, [scriptPath], {
		input: JSON.stringify(payload),
		encoding: "utf8",
		timeout: options.timeoutMs || 30000,
		env: {
			...process.env,
			PYTHONUTF8: "1",
			PYTHONIOENCODING: "utf-8",
			PYTHONPATH: [path.join(getIspRoot(), "_lib"), process.env.PYTHONPATH].filter(Boolean).join(path.delimiter),
			ISP_ROOT: getIspRoot(),
		},
	});

	if (result.error) {
		throw result.error;
	}

	if (result.status !== 0) {
		throw new Error((result.stderr || "").trim() || `process.py exited with ${result.status}`);
	}

	const stdout = (result.stdout || "").trim();
	if (!stdout) {
		return {
			ran: true,
			stdout: null,
		};
	}

	return {
		ran: true,
		stdout: JSON.parse(stdout),
	};
}

class ISPBlock {
	constructor() {
		this.description = {
			displayName: "ISPBlock",
			name: "ispBlock",
			icon: "fa:image",
			group: ["transform"],
			version: 1,
			description: "Runs a folder-managed ISP processing block",
			defaults: {
				name: "ISPBlock",
			},
			inputs: ["main"],
			outputs: ["main"],
			properties: [
				{
					displayName: `ISP blocks are loaded from workspace/ISPBlock/* folders. Global input is shared from workspace/ISPBlock/global.json.<br><br>${buildReadmeNotice()}`,
					name: "notice",
					type: "notice",
					default: "",
				},
				{
					displayName: "Block Name or ID",
					name: "blockName",
					type: "options",
					typeOptions: {
						loadOptionsMethod: "getBlocks",
					},
					default: "ProcA",
					description: "The ISP block folder to run. Choose from the list, or specify an ID using an expression.",
				},
				{
					displayName: "Version Name or ID",
					name: "version",
					type: "options",
					typeOptions: {
						loadOptionsMethod: "getVersions",
					},
					default: "default",
					description: "The version folder under ISPBlock/<Block>/versions to use. The selected value is passed to process.py as payload.version.",
				},
				{
					displayName: "Input Files JSON",
					name: "inputFilesJson",
					type: "json",
					default: "{}",
					description: "Fallback only. Prefer connecting ISPInput before ISPBlock. Shape: key=name, value=file path.",
				},
				{
					displayName: "Global Config File: edit workspace/ISPBlock/global.json once to update gain, EIT, and TMC for every ISPBlock node.",
					name: "globalConfigNotice",
					type: "notice",
					default: "",
				},
				{
					displayName: "Output Directory",
					name: "outputDirectory",
					type: "string",
					default: "",
					description: "Leave empty to place output paths next to the input files",
				},
				{
					displayName: "Run process.py",
					name: "runProcessor",
					type: "boolean",
					default: true,
					description: "Whether to run ISPBlock/<Block>/process.py with the file-list payload",
				},
				{
					displayName: "Python Command",
					name: "pythonCommand",
					type: "string",
					default: "python",
					displayOptions: {
						show: {
							runProcessor: [true],
						},
					},
				},
				{
					displayName: "Require Input Files Exist",
					name: "requireInputFiles",
					type: "boolean",
					default: false,
					description: "Whether process.py should fail when an input path does not exist",
					displayOptions: {
						show: {
							runProcessor: [true],
						},
					},
				},
				{
					displayName: "Processor Timeout MS",
					name: "processorTimeoutMs",
					type: "number",
					default: 30000,
					displayOptions: {
						show: {
							runProcessor: [true],
						},
					},
				},
				{
					displayName: "Include README in Output",
					name: "includeReadme",
					type: "boolean",
					default: true,
				},
			],
		};

		this.methods = {
			loadOptions: {
				async getBlocks() {
					return listBlocks();
				},
				async getVersions() {
					const blockName = this.getCurrentNodeParameter("blockName") || "ProcA";
					const versions = listVersions(blockName);
					if (versions.length > 0) {
						return versions;
					}

					return [
						{
							name: "default",
							value: "default",
							description: `No versions found for ${blockName}; create ISPBlock/${blockName}/versions/default.`,
						},
					];
				},
			},
		};
	}

	async execute() {
		const items = this.getInputData();
		const returnData = [];
		const ispRoot = getIspRoot();

		if (items.length > 1) {
			throw new NodeOperationError(this.getNode(), "ISPBlock only supports one item per execution to protect memory.");
		}

		for (let itemIndex = 0; itemIndex < items.length; itemIndex += 1) {
			const blockName = this.getNodeParameter("blockName", itemIndex);
			const version = this.getNodeParameter("version", itemIndex) || "default";
			const inputFilesJson = this.getNodeParameter("inputFilesJson", itemIndex);
			const outputDirectory = this.getNodeParameter("outputDirectory", itemIndex);
			const runProcessor = this.getNodeParameter("runProcessor", itemIndex);
			const pythonCommand = this.getNodeParameter("pythonCommand", itemIndex);
			const requireInputFiles = this.getNodeParameter("requireInputFiles", itemIndex);
			const processorTimeoutMs = this.getNodeParameter("processorTimeoutMs", itemIndex);
			const includeReadme = this.getNodeParameter("includeReadme", itemIndex);
			let globalInput;

			try {
				globalInput = readGlobalInput();
			} catch (error) {
				throw new NodeOperationError(this.getNode(), `ISPBlock/global.json must be valid JSON: ${error.message}`, {
					itemIndex,
				});
			}

			const blockPath = path.join(ispRoot, blockName);
			if (!fs.existsSync(blockPath) || !fs.statSync(blockPath).isDirectory()) {
				throw new NodeOperationError(this.getNode(), `Unknown ISP block folder: ${blockName}`, { itemIndex });
			}
			const versionPath = path.join(blockPath, "versions", version);
			if (!fs.existsSync(versionPath) || !fs.statSync(versionPath).isDirectory()) {
				throw new NodeOperationError(this.getNode(), `Unknown ISP block version: ${blockName}/${version}`, { itemIndex });
			}

			let mainFiles;
			let subFiles;
			try {
				mainFiles = normalizeFileMap(
					items[itemIndex].json.mainFiles ||
						items[itemIndex].json.files ||
						safeParseJson(inputFilesJson, {}, "Input Files JSON"),
				);
				subFiles = normalizeFileMap(items[itemIndex].json.subFiles || {}, "Sub input files");
			} catch (error) {
				throw new NodeOperationError(this.getNode(), error.message, { itemIndex });
			}

			const originalMainFiles = items[itemIndex].json.originalMainFiles || items[itemIndex].json.originalFiles || mainFiles;
			const originalSubFiles = items[itemIndex].json.originalSubFiles || subFiles;
			const originalFiles = originalMainFiles;
			const outputMainFiles = {};
			const outputSubFiles = {};
			const outputFiles = outputMainFiles;

			for (const [name, filePath] of Object.entries(originalMainFiles)) {
				outputMainFiles[name] = makeOutputPath(filePath, blockName, outputDirectory);
			}

			for (const [name, filePath] of Object.entries(originalSubFiles)) {
				outputSubFiles[name] = makeOutputPath(filePath, blockName, outputDirectory);
			}

			const readmePath = path.join(blockPath, "README.md");
			const blockReadme = fs.existsSync(readmePath) ? fs.readFileSync(readmePath, "utf8") : "";
			let processingResult = {
				ran: false,
				reason: "disabled",
			};

			if (runProcessor) {
				try {
					processingResult = runProcessorScript({
						blockPath,
						blockName,
						version,
						versionPath,
						mainFiles,
						subFiles,
						outputMainFiles,
						outputSubFiles,
						originalMainFiles,
						originalSubFiles,
						globalInput,
						pythonCommand,
						options: {
							requireInputFiles,
							timeoutMs: processorTimeoutMs,
						},
					});
				} catch (error) {
					throw new NodeOperationError(this.getNode(), `ISP processor ${blockName} failed: ${error.message}`, {
						itemIndex,
					});
				}
			}

			console.log(`[ISPBlock:${blockName}:${version}] mainFiles=${JSON.stringify(mainFiles)} subFiles=${JSON.stringify(subFiles)} global=${JSON.stringify(globalInput)}`);

			returnData.push({
				json: {
					...items[itemIndex].json,
					files: outputMainFiles,
					mainFiles: outputMainFiles,
					subFiles: outputSubFiles,
					originalFiles,
					originalMainFiles,
					originalSubFiles,
					lastBlock: blockName,
					version,
					versionPath,
					globalInput,
					ispHistory: [
						...(items[itemIndex].json.ispHistory || []),
						{
							blockName,
							version,
							versionPath,
							inputFiles: mainFiles,
							mainInputFiles: mainFiles,
							subInputFiles: subFiles,
							outputFiles,
							outputMainFiles,
							outputSubFiles,
							globalInput,
							readmePath,
							processingResult,
						},
					],
					processingResult,
					...(includeReadme ? { blockReadme } : {}),
				},
				pairedItem: {
					item: itemIndex,
				},
			});
		}

		return [returnData];
	}
}

exports.ISPBlock = ISPBlock;
