"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.PipelineC = void 0;

const { createPipelineNode } = require("../PipelineShared/createPipelineNode");

exports.PipelineC = createPipelineNode({
	className: "PipelineC",
	displayName: "Pipeline C",
	nodeName: "pipelineC",
	appendText: "C",
	description: "Prints the input and appends C",
});
