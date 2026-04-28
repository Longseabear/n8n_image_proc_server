"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.ISPInput = void 0;

const { NodeOperationError } = require("n8n-workflow");

function parseFileMap(value) {
	try {
		const parsed = JSON.parse(value);
		if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
			throw new Error("Input files must be an object");
		}
		return parsed;
	} catch (error) {
		throw new Error(`Input Files JSON must be valid JSON object: ${error.message}`);
	}
}

function normalizeFileMap(value, label) {
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		throw new Error(`${label} must be an object`);
	}

	return value;
}

class ISPInput {
	constructor() {
		this.description = {
			displayName: "ISPInput",
			name: "ispInput",
			icon: "fa:file-image",
			group: ["input"],
			version: 1,
			description: "Creates the initial ISP file list placeholder",
			defaults: {
				name: "ISPInput",
			},
			inputs: ["main"],
			outputs: ["main"],
			properties: [
				{
					displayName: "File Source",
					name: "fileSource",
					type: "options",
					options: [
						{
							name: "Auto",
							value: "auto",
						},
						{
							name: "Input JSON",
							value: "inputJson",
						},
						{
							name: "Node Parameter",
							value: "parameter",
						},
					],
					default: "auto",
					description: "Auto uses incoming files, webhook body.files, then the parameter fallback",
				},
				{
					displayName: "Main Input Files JSON",
					name: "mainInputFilesJson",
					type: "json",
					default: "{\n  \"raw\": \"C:/images/input.png\"\n}",
					description: "Main input file map. Shape: key=name, value=file path",
				},
				{
					displayName: "Sub Input Files JSON",
					name: "subInputFilesJson",
					type: "json",
					default: "{}",
					description: "Sub input file map. Shape: key=name, value=file path",
				},
			],
		};
	}

	async execute() {
		const items = this.getInputData();
		const sourceItems = items.length > 0 ? items : [{ json: {} }];
		const returnData = [];

		if (sourceItems.length > 1) {
			throw new NodeOperationError(this.getNode(), "ISPInput only supports one item per execution to protect memory.");
		}

		for (let itemIndex = 0; itemIndex < sourceItems.length; itemIndex += 1) {
			const sourceJson = sourceItems[itemIndex].json || {};
			const fileSource = this.getNodeParameter("fileSource", itemIndex);
			let mainFiles;
			let subFiles;
			try {
				if (fileSource === "inputJson") {
					mainFiles = normalizeFileMap(
						sourceJson.mainFiles || sourceJson.files || sourceJson.body?.mainFiles || sourceJson.body?.files,
						"Incoming main files",
					);
					subFiles = normalizeFileMap(sourceJson.subFiles || sourceJson.body?.subFiles || {}, "Incoming sub files");
				} else if (fileSource === "parameter") {
					mainFiles = parseFileMap(
						this.getNodeParameter("mainInputFilesJson", itemIndex) ??
							this.getNodeParameter("inputFilesJson", itemIndex),
					);
					subFiles = parseFileMap(this.getNodeParameter("subInputFilesJson", itemIndex) || "{}");
				} else {
					mainFiles =
						sourceJson.mainFiles ||
						sourceJson.files ||
						sourceJson.body?.mainFiles ||
						sourceJson.body?.files ||
						parseFileMap(
							this.getNodeParameter("mainInputFilesJson", itemIndex) ??
								this.getNodeParameter("inputFilesJson", itemIndex),
						);
					subFiles =
						sourceJson.subFiles ||
						sourceJson.body?.subFiles ||
						parseFileMap(this.getNodeParameter("subInputFilesJson", itemIndex) || "{}");
					mainFiles = normalizeFileMap(mainFiles, "Incoming main files");
					subFiles = normalizeFileMap(subFiles, "Incoming sub files");
				}
			} catch (error) {
				throw new NodeOperationError(this.getNode(), error.message, { itemIndex });
			}

			returnData.push({
				json: {
					...sourceJson,
					files: mainFiles,
					mainFiles,
					subFiles,
					originalFiles: mainFiles,
					originalMainFiles: mainFiles,
					originalSubFiles: subFiles,
					ispHistory: [],
				},
				pairedItem: {
					item: itemIndex,
				},
			});
		}

		return [returnData];
	}
}

exports.ISPInput = ISPInput;
