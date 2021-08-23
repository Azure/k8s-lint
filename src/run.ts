import * as core from '@actions/core';

import { kubeEvalLint } from './kubeval';
import { kubectlEvalLint } from './kubectl';


export async function kubeval() {
    let manifestsInput = core.getInput('manifests', { required: true });
    let manifests = manifestsInput.split('\n');
    const type = core.getInput('lintType', { required: true });
    if (type.toLocaleLowerCase() === 'dryrun') {
        let namespace = core.getInput('namespace', {required: false});
        if (!namespace) namespace = "default";
        await kubectlEvalLint(manifests, namespace);
    } else {
        await kubeEvalLint(manifests);
    }
}

kubeval().catch(core.setFailed);