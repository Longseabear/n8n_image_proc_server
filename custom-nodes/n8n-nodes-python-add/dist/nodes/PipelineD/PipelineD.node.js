"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.PipelineD = void 0;

const { createPipelineNode } = require("../PipelineShared/createPipelineNode");

exports.PipelineD = createPipelineNode({
	className: "PipelineD",
	displayName: "Pipeline D",
	nodeName: "pipelineD",
	appendText: "D",
	description: "Prints the input and appends D",
});
