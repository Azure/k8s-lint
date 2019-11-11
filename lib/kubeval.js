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
const os = require("os");
const path = require("path");
const fs = require("fs");
const toolCache = require("@actions/tool-cache");
const core = require("@actions/core");
const io = require("@actions/io");
const toolrunner_1 = require("@actions/exec/lib/toolrunner");
const utils_1 = require("./utils");
const toolName = 'kubeval';
function getkubevalDownloadURL() {
    switch (os.type()) {
        case 'Linux':
            return "https://github.com/instrumenta/kubeval/releases/latest/download/kubeval-linux-amd64.tar.gz";
        case 'Darwin':
            return "https://github.com/instrumenta/kubeval/releases/latest/download/kubeval-darwin-amd64.tar.gz";
        case 'Windows_NT':
        default:
            return "https://github.com/instrumenta/kubeval/releases/latest/download/kubeval-windows-amd64.zip";
    }
}
function downloadKubeval() {
    return __awaiter(this, void 0, void 0, function* () {
        let kubevalDownloadPath = '';
        try {
            kubevalDownloadPath = yield toolCache.downloadTool(getkubevalDownloadURL());
            if (os.type() !== 'Windows_NT') {
                yield io.cp(kubevalDownloadPath, path.join(path.dirname(kubevalDownloadPath), 'tool.tar.gz'));
                kubevalDownloadPath = path.join(path.dirname(kubevalDownloadPath), 'tool.tar.gz');
            }
            switch (os.type()) {
                case 'Linux':
                case 'Darwin':
                    kubevalDownloadPath = yield toolCache.extractTar(kubevalDownloadPath);
                    break;
                case 'Windows_NT':
                default:
                    kubevalDownloadPath = yield toolCache.extractZip(kubevalDownloadPath);
            }
        }
        catch (exception) {
            throw new Error('Download Kubeval Failed');
        }
        const kubevalPath = path.join(kubevalDownloadPath, toolName + utils_1.getExecutableExtension());
        fs.chmodSync(kubevalPath, '777');
        core.addPath(kubevalDownloadPath);
        return kubevalPath;
    });
}
function kubeEvalLint(manifests) {
    return __awaiter(this, void 0, void 0, function* () {
        let toolPath;
        try {
            toolPath = yield io.which(toolName, true);
        }
        catch (ex) {
            toolPath = yield downloadKubeval();
        }
        for (let i = 0; i < manifests.length; i++) {
            const manifest = manifests[i];
            let toolRunner = new toolrunner_1.ToolRunner(toolPath, [manifest]);
            const code = yield toolRunner.exec();
            if (code != 0) {
                core.setFailed('Your manifests have some errors');
            }
        }
    });
}
exports.kubeEvalLint = kubeEvalLint;
