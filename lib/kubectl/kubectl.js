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
exports.kubectlLint = void 0;
const toolrunner_1 = require("@actions/exec/lib/toolrunner");
const io = require("@actions/io");
const TOOL_NAME = "kubectl";
function kubectlLint(manifests, namespace) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!process.env["KUBECONFIG"])
            throw Error("KUBECONFIG env is not explicitly set.");
        const kubectlPath = yield io.which(TOOL_NAME, false);
        if (!kubectlPath)
            throw Error("Kubectl not found. You must install it before running this action.");
        for (const manifest of manifests) {
            const toolRunner = new toolrunner_1.ToolRunner(kubectlPath, [
                "apply",
                "-f",
                manifest,
                "--dry-run=server",
                "--namespace",
                namespace,
            ]);
            yield toolRunner.exec();
        }
    });
}
exports.kubectlLint = kubectlLint;
