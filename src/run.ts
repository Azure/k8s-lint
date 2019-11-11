import * as core from '@actions/core';

import { kubeEvalLint } from './kubeval';
import { kubectlEvalLint } from './kubectl';


async function kubeval() {
    let manifestsInput = core.getInput('manifests', { required: true });
    let manifests = manifestsInput.split('\n');
    const type = core.getInput('lintType', { required: true });
    if (type.toLocaleLowerCase() === 'dryrun') {
        await kubectlEvalLint(manifests);
    } else {
        await kubeEvalLint(manifests);
    }
}

kubeval().catch(core.setFailed);