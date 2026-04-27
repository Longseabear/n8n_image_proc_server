"use strict";

function createPipelineNode({ className, displayName, nodeName, appendText, description }) {
	return class {
		constructor() {
			this.description = {
				displayName,
				name: nodeName,
				icon: "fa:arrow-right",
				group: ["transform"],
				version: 1,
				description,
				defaults: {
					name: displayName,
				},
				inputs: ["main"],
				outputs: ["main"],
				properties: [
					{
						displayName: "Initial Input",
						name: "initialInput",
						type: "string",
						default: "",
						description: "Used only when the incoming item has no value field",
					},
					{
						displayName: "Append Text",
						name: "appendText",
						type: "string",
						default: appendText,
						description: "Text appended to the incoming value",
					},
					{
						displayName: "Global Parameter Override",
						name: "globalParameterOverride",
						type: "string",
						default: "",
						description: "Leave empty to use PIPELINE_GLOBAL_PARAMETER from the n8n server environment",
					},
				],
			};
		}

		async execute() {
			const items = this.getInputData();
			const returnData = [];

			for (let itemIndex = 0; itemIndex < items.length; itemIndex += 1) {
				const initialInput = this.getNodeParameter("initialInput", itemIndex);
				const currentAppendText = this.getNodeParameter("appendText", itemIndex);
				const override = this.getNodeParameter("globalParameterOverride", itemIndex);
				const globalParameter = override || process.env.PIPELINE_GLOBAL_PARAMETER || "";
				const input = items[itemIndex].json.value ?? initialInput;
				const output = `${input}${currentAppendText}`;

				console.log(`[${displayName}] input=${input} global=${globalParameter} output=${output}`);

				returnData.push({
					json: {
						...items[itemIndex].json,
						step: className,
						input,
						value: output,
						appended: currentAppendText,
						globalParameter,
					},
					pairedItem: {
						item: itemIndex,
					},
				});
			}

			return [returnData];
		}
	};
}

module.exports = {
	createPipelineNode,
};
