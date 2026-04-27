"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.ISPBlock = void 0;

const fs = require("fs");
const path = require("path");
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
					displayName: "ISP blocks are loaded from workspace/ISPBlock/* folders. Each block folder should contain README.md. This demo does not process image bytes; it returns deterministic output paths.",
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
					displayName: "Input Files JSON",
					name: "inputFilesJson",
					type: "json",
					default: "{\n  \"raw\": \"C:/images/input.png\"\n}",
					description: "Used only when the incoming item has no files field. Shape: key=name, value=file path.",
				},
				{
					displayName: "Global Input",
					name: "globalInput",
					type: "collection",
					default: {},
					options: [
						{
							displayName: "Gain",
							name: "gain",
							type: "number",
							default: 1,
						},
						{
							displayName: "EIT",
							name: "EIT",
							type: "string",
							default: "",
						},
						{
							displayName: "TMC",
							name: "TMC",
							type: "string",
							default: "",
						},
					],
				},
				{
					displayName: "Output Directory",
					name: "outputDirectory",
					type: "string",
					default: "",
					description: "Leave empty to place output paths next to the input files",
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
			},
		};
	}

	async execute() {
		const items = this.getInputData();
		const returnData = [];
		const ispRoot = getIspRoot();

		for (let itemIndex = 0; itemIndex < items.length; itemIndex += 1) {
			const blockName = this.getNodeParameter("blockName", itemIndex);
			const inputFilesJson = this.getNodeParameter("inputFilesJson", itemIndex);
			const globalInput = this.getNodeParameter("globalInput", itemIndex);
			const outputDirectory = this.getNodeParameter("outputDirectory", itemIndex);
			const includeReadme = this.getNodeParameter("includeReadme", itemIndex);

			const blockPath = path.join(ispRoot, blockName);
			if (!fs.existsSync(blockPath) || !fs.statSync(blockPath).isDirectory()) {
				throw new NodeOperationError(this.getNode(), `Unknown ISP block folder: ${blockName}`, { itemIndex });
			}

			let files;
			try {
				files = normalizeFileMap(items[itemIndex].json.files || safeParseJson(inputFilesJson, {}, "Input Files JSON"));
			} catch (error) {
				throw new NodeOperationError(this.getNode(), error.message, { itemIndex });
			}

			const originalFiles = items[itemIndex].json.originalFiles || files;
			const outputFiles = {};

			for (const [name, filePath] of Object.entries(originalFiles)) {
				outputFiles[name] = makeOutputPath(filePath, blockName, outputDirectory);
			}

			const readmePath = path.join(blockPath, "README.md");
			const blockReadme = fs.existsSync(readmePath) ? fs.readFileSync(readmePath, "utf8") : "";

			console.log(`[ISPBlock:${blockName}] files=${JSON.stringify(files)} global=${JSON.stringify(globalInput)}`);

			returnData.push({
				json: {
					...items[itemIndex].json,
					files: outputFiles,
					originalFiles,
					lastBlock: blockName,
					globalInput,
					ispHistory: [
						...(items[itemIndex].json.ispHistory || []),
						{
							blockName,
							inputFiles: files,
							outputFiles,
							globalInput,
							readmePath,
						},
					],
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
