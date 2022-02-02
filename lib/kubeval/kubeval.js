"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getKubevalDownloadUrl = exports.downloadKubeval = exports.kubevalLint = void 0;
const os = require("os");
const path = require("path");
const fs = require("fs");
const toolCache = require("@actions/tool-cache");
const core = require("@actions/core");
const io = require("@actions/io");
const toolrunner_1 = require("@actions/exec/lib/toolrunner");
const utils_1 = require("../utils");
const TOOL_NAME = "kubeval";
function kubevalLint(manifests) {
    return __awaiter(this, void 0, void 0, function* () {
        const toolPath = (yield io.which(TOOL_NAME, false)) || (yield downloadKubeval());
        for (const manifest of manifests) {
            const toolRunner = new toolrunner_1.ToolRunner(toolPath, [manifest]);
            const code = yield toolRunner.exec();
            if (code != 0) {
                throw Error("Your manifest has errors");
            }
        }
    });
}
exports.kubevalLint = kubevalLint;
function downloadKubeval() {
    return __awaiter(this, void 0, void 0, function* () {
        const downloadPath = yield toolCache.downloadTool(getKubevalDownloadUrl());
        // extract from download
        let extractedPath;
        switch (os.type()) {
            case "Linux":
            case "Darwin":
                const newPath = path.join(path.dirname(downloadPath), "tool.tar.gz");
                yield io.cp(downloadPath, newPath);
                extractedPath = yield toolCache.extractTar(newPath);
                break;
            case "Windows_NT":
            default:
                extractedPath = yield toolCache.extractZip(downloadPath);
        }
        // get and make executable
        const kubevalPath = path.join(extractedPath, TOOL_NAME + utils_1.getExecutableExtension());
        fs.chmodSync(kubevalPath, "777");
        core.addPath(extractedPath);
        return kubevalPath;
    });
}
exports.downloadKubeval = downloadKubeval;
function getKubevalDownloadUrl() {
    switch (os.type()) {
        case "Linux":
            return "https://github.com/instrumenta/kubeval/releases/latest/download/kubeval-linux-amd64.tar.gz";
        case "Darwin":
            return "https://github.com/instrumenta/kubeval/releases/latest/download/kubeval-darwin-amd64.tar.gz";
        case "Windows_NT":
        default:
            return "https://github.com/instrumenta/kubeval/releases/latest/download/kubeval-windows-amd64.zip";
    }
}
exports.getKubevalDownloadUrl = getKubevalDownloadUrl;
