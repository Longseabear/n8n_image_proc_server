"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.PipelineA = void 0;

const { createPipelineNode } = require("../PipelineShared/createPipelineNode");

exports.PipelineA = createPipelineNode({
	className: "PipelineA",
	displayName: "Pipeline A",
	nodeName: "pipelineA",
	appendText: "A",
	description: "Prints the input and appends A",
});
