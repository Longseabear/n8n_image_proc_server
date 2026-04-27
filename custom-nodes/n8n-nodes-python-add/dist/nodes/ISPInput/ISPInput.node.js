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
					displayName: "Input Files JSON",
					name: "inputFilesJson",
					type: "json",
					default: "{\n  \"raw\": \"C:/images/input.png\"\n}",
					description: "Shape: key=name, value=file path",
				},
			],
		};
	}

	async execute() {
		const items = this.getInputData();
		const sourceItems = items.length > 0 ? items : [{ json: {} }];
		const returnData = [];

		for (let itemIndex = 0; itemIndex < sourceItems.length; itemIndex += 1) {
			const sourceJson = sourceItems[itemIndex].json || {};
			const fileSource = this.getNodeParameter("fileSource", itemIndex);
			let files;
			try {
				if (fileSource === "inputJson") {
					files = normalizeFileMap(sourceJson.files || sourceJson.body?.files, "Incoming files");
				} else if (fileSource === "parameter") {
					files = parseFileMap(this.getNodeParameter("inputFilesJson", itemIndex));
				} else {
					files = sourceJson.files || sourceJson.body?.files || parseFileMap(this.getNodeParameter("inputFilesJson", itemIndex));
					files = normalizeFileMap(files, "Incoming files");
				}
			} catch (error) {
				throw new NodeOperationError(this.getNode(), error.message, { itemIndex });
			}

			returnData.push({
				json: {
					...sourceJson,
					files,
					originalFiles: files,
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
