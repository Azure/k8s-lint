import * as core from '@actions/core'

import {kubevalLint} from './kubeval/kubeval'
import {kubectlLint} from './kubectl/kubectl'

export async function kubeval() {
   // get inputs
   const type = core.getInput('lintType', {required: true})
   const manifestsInput = core.getInput('manifests', {required: true})
   const manifests = manifestsInput.split('\n')

   if (type.toLocaleLowerCase() === 'dryrun') {
      const namespace =
         core.getInput('namespace', {required: false}) || 'default'
      await kubectlLint(manifests, namespace)
   } else {
      await kubevalLint(manifests)
   }
}

kubeval().catch(core.setFailed)
