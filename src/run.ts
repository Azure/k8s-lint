import { getInput, setFailed } from '@actions/core';

import * as kubeconform from './kubeconform/index.js';
import * as kubectl from './kubectl/index.js';

export async function run() {
  const type = getInput('lint-type', { required: true });
  const manifestsInput = getInput('manifests', { required: true });
  const manifests = manifestsInput.split('\n');

  if (type.toLocaleLowerCase() === 'dry-run') {
    const namespace = getInput('namespace', { required: false }) || 'default';
    await kubectl.kubectlLint(manifests, namespace);
  } else {
    const kubeconformOpts = getInput('kubeconform-options', { required: false }) || '-summary';
    await kubeconform.kubeconformLint(manifests, kubeconformOpts);
  }
}

run().catch(setFailed);
