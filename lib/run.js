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
const core = require("@actions/core");
const kubeval_1 = require("./kubeval");
const kubectl_1 = require("./kubectl");
function kubeval() {
    return __awaiter(this, void 0, void 0, function* () {
        let manifestsInput = core.getInput('manifests', { required: true });
        let manifests = manifestsInput.split('\n');
        const type = core.getInput('lintType', { required: true });
        if (type.toLocaleLowerCase() === 'dryrun') {
            yield kubectl_1.kubectlEvalLint(manifests);
        }
        else {
            yield kubeval_1.kubeEvalLint(manifests);
        }
    });
}
kubeval().catch(core.setFailed);
