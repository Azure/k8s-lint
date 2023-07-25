import * as core from '@actions/core'

import {kubeconformLint} from './kubeconform/kubeconform'
import {kubectlLint} from './kubectl/kubectl'

export async function kubeconform() {
   // get inputs
   const type = core.getInput('lintType', {required: true})
   const manifestsInput = core.getInput('manifests', {required: true})
   const manifests = manifestsInput.split('\n')

   if (type.toLocaleLowerCase() === 'dryrun') {
      const namespace =
         core.getInput('namespace', {required: false}) || 'default'
      await kubectlLint(manifests, namespace)
   } else {
      const kubeconformOpts =
         core.getInput('kubeconformOpts', {required: false}) || '-summary'
      await kubeconformLint(manifests, kubeconformOpts)
   }
}

kubeconform().catch(core.setFailed)
