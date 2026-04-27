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
			let files;
			try {
				files = parseFileMap(this.getNodeParameter("inputFilesJson", itemIndex));
			} catch (error) {
				throw new NodeOperationError(this.getNode(), error.message, { itemIndex });
			}

			returnData.push({
				json: {
					...sourceItems[itemIndex].json,
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
