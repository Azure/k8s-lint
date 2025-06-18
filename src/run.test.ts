import * as run from '../src/run'
import * as kubeconform from './kubeconform/kubeconform'
import * as kubectl from './kubectl/kubectl'
import * as core from '@actions/core'

describe('run', () => {
   test('runs kubectl dry run based on input', async () => {
      jest.spyOn(core, 'getInput').mockImplementation((input) => {
         if (input == 'manifests')
            return 'manifest1.yaml\nmanifest2.yaml\nmanifest3.yaml'
         if (input == 'lintType') return 'dryrun'
         if (input == 'namespace') return 'sampleNamespace'
      })
      jest.spyOn(kubectl, 'kubectlLint').mockImplementation()

      expect(await run.kubeconform()).toBeUndefined()
      expect(core.getInput).toHaveBeenCalledTimes(3)
      expect(kubectl.kubectlLint).toHaveBeenCalledWith(
         ['manifest1.yaml', 'manifest2.yaml', 'manifest3.yaml'],
         'sampleNamespace'
      )
   })

   test('uses default namespace if input not given', async () => {
      jest.spyOn(core, 'getInput').mockImplementation((input) => {
         if (input == 'manifests')
            return 'manifest1.yaml\nmanifest2.yaml\nmanifest3.yaml'
         if (input == 'lintType') return 'dryrun'
         if (input == 'namespace') return ''
      })
      jest.spyOn(kubectl, 'kubectlLint').mockImplementation()

      expect(await run.kubeconform()).toBeUndefined()
      expect(core.getInput).toHaveBeenCalledTimes(3)
      expect(kubectl.kubectlLint).toHaveBeenCalledWith(
         ['manifest1.yaml', 'manifest2.yaml', 'manifest3.yaml'],
         'default'
      )
   })

   test('runs kubeconform on manifests based on input', async () => {
      jest.spyOn(core, 'getInput').mockImplementation((input) => {
         if (input == 'manifests')
            return 'manifest1.yaml\nmanifest2.yaml\nmanifest3.yaml'
         if (input == 'lintType') return 'kubeconform'
         if (input == 'kubeconformOpts') return '-summary'
      })
      jest.spyOn(kubeconform, 'kubeconformLint').mockImplementation()

      expect(await run.kubeconform()).toBeUndefined()
      expect(core.getInput).toHaveBeenCalledTimes(3)
      expect(kubeconform.kubeconformLint).toHaveBeenCalledWith(
         ['manifest1.yaml', 'manifest2.yaml', 'manifest3.yaml'],
         '-summary'
      )
   })

   test('uses -summary option if input not given', async () => {
      jest.spyOn(core, 'getInput').mockImplementation((input) => {
         if (input == 'manifests')
            return 'manifest1.yaml\nmanifest2.yaml\nmanifest3.yaml'
         if (input == 'lintType') return 'kubeconform'
         if (input == 'kubeconformOpts') return ''
      })
      jest.spyOn(kubeconform, 'kubeconformLint').mockImplementation()

      expect(await run.kubeconform()).toBeUndefined()
      expect(core.getInput).toHaveBeenCalledTimes(3)
      expect(kubeconform.kubeconformLint).toHaveBeenCalledWith(
         ['manifest1.yaml', 'manifest2.yaml', 'manifest3.yaml'],
         '-summary'
      )
   })
})
