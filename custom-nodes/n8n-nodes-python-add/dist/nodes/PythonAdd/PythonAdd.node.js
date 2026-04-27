"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.PythonAdd = void 0;

const { spawnSync } = require("child_process");
const { NodeOperationError } = require("n8n-workflow");

class PythonAdd {
	constructor() {
		this.description = {
			displayName: "Python Add",
			name: "pythonAdd",
			icon: "fa:plus",
			group: ["transform"],
			version: 1,
			description: "Adds A and B by running a tiny Python calculation",
			defaults: {
				name: "Python Add",
			},
			inputs: ["main"],
			outputs: ["main"],
			properties: [
				{
					displayName: "A",
					name: "a",
					type: "number",
					default: 1,
					description: "First number",
				},
				{
					displayName: "B",
					name: "b",
					type: "number",
					default: 2,
					description: "Second number",
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

		for (let itemIndex = 0; itemIndex < items.length; itemIndex += 1) {
			const a = this.getNodeParameter("a", itemIndex);
			const b = this.getNodeParameter("b", itemIndex);
			const pythonCommand = this.getNodeParameter("pythonCommand", itemIndex);

			const result = spawnSync(
				pythonCommand,
				["-c", "import sys; print(float(sys.argv[1]) + float(sys.argv[2]))", String(a), String(b)],
				{ encoding: "utf8" },
			);

			if (result.error) {
				throw new NodeOperationError(this.getNode(), result.error.message, { itemIndex });
			}

			if (result.status !== 0) {
				throw new NodeOperationError(
					this.getNode(),
					`Python failed: ${(result.stderr || "").trim() || `exit code ${result.status}`}`,
					{ itemIndex },
				);
			}

			const raw = result.stdout.trim();
			const sum = Number(raw);

			returnData.push({
				json: {
					...items[itemIndex].json,
					a,
					b,
					sum,
				},
				pairedItem: {
					item: itemIndex,
				},
			});
		}

		return [returnData];
	}
}

exports.PythonAdd = PythonAdd;
