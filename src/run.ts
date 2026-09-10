import * as core from '@actions/core'

import {kubeconformLint} from './kubeconform/kubeconform.js'
import {kubectlLint} from './kubectl/kubectl.js'
import {expandManifests} from './utils.js'
import {isHelmChart, renderHelmChart} from './helm/helm.js'

export async function kubeconform() {
   const type = core.getInput('lintType', {required: true})
   const manifestsInput = core.getInput('manifests', {required: true})
   const namespace = core.getInput('namespace', {required: false}) || 'default'
   const expanded = expandManifests(manifestsInput.split('\n'))

   const manifests: string[] = []
   for (const m of expanded) {
      if (isHelmChart(m)) {
         manifests.push(await renderHelmChart(m, namespace))
      } else {
         manifests.push(m)
      }
   }

   if (manifests.length === 0) {
      throw new Error('No valid manifest files found to lint')
   }

   if (type.toLocaleLowerCase() === 'dryrun') {
      await kubectlLint(manifests, namespace)
   } else {
      const kubeconformOpts =
         core.getInput('kubeconformOpts', {required: false}) || '-summary'
      await kubeconformLint(manifests, kubeconformOpts)
   }
}
