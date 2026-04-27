"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.PipelineB = void 0;

const { createPipelineNode } = require("../PipelineShared/createPipelineNode");

exports.PipelineB = createPipelineNode({
	className: "PipelineB",
	displayName: "Pipeline B",
	nodeName: "pipelineB",
	appendText: "B",
	description: "Prints the input and appends B",
});
