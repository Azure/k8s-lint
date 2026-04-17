import {describe, expect, test, vi, beforeEach} from 'vitest'

vi.mock('@actions/core')
vi.mock('./kubeconform/kubeconform.js')
vi.mock('./kubectl/kubectl.js')

const core = await import('@actions/core')
const kubeconform = await import('./kubeconform/kubeconform.js')
const kubectl = await import('./kubectl/kubectl.js')
const run = await import('./run.js')

describe('run', () => {
   beforeEach(() => {
      vi.clearAllMocks()
   })

   test('runs kubectl dry run based on input', async () => {
      vi.mocked(core.getInput).mockImplementation((input) => {
         if (input == 'manifests')
            return 'manifest1.yaml\nmanifest2.yaml\nmanifest3.yaml'
         if (input == 'lintType') return 'dryrun'
         if (input == 'namespace') return 'sampleNamespace'
         return ''
      })

      expect(await run.kubeconform()).toBeUndefined()
      expect(core.getInput).toHaveBeenCalledTimes(3)
      expect(kubectl.kubectlLint).toHaveBeenCalledWith(
         ['manifest1.yaml', 'manifest2.yaml', 'manifest3.yaml'],
         'sampleNamespace'
      )
   })

   test('uses default namespace if input not given', async () => {
      vi.mocked(core.getInput).mockImplementation((input) => {
         if (input == 'manifests')
            return 'manifest1.yaml\nmanifest2.yaml\nmanifest3.yaml'
         if (input == 'lintType') return 'dryrun'
         if (input == 'namespace') return ''
         return ''
      })

      expect(await run.kubeconform()).toBeUndefined()
      expect(core.getInput).toHaveBeenCalledTimes(3)
      expect(kubectl.kubectlLint).toHaveBeenCalledWith(
         ['manifest1.yaml', 'manifest2.yaml', 'manifest3.yaml'],
         'default'
      )
   })

   test('runs kubeconform on manifests based on input', async () => {
      vi.mocked(core.getInput).mockImplementation((input) => {
         if (input == 'manifests')
            return 'manifest1.yaml\nmanifest2.yaml\nmanifest3.yaml'
         if (input == 'lintType') return 'kubeconform'
         if (input == 'kubeconformOpts') return '-summary'
         return ''
      })

      expect(await run.kubeconform()).toBeUndefined()
      expect(core.getInput).toHaveBeenCalledTimes(3)
      expect(kubeconform.kubeconformLint).toHaveBeenCalledWith(
         ['manifest1.yaml', 'manifest2.yaml', 'manifest3.yaml'],
         '-summary'
      )
   })

   test('uses -summary option if input not given', async () => {
      vi.mocked(core.getInput).mockImplementation((input) => {
         if (input == 'manifests')
            return 'manifest1.yaml\nmanifest2.yaml\nmanifest3.yaml'
         if (input == 'lintType') return 'kubeconform'
         if (input == 'kubeconformOpts') return ''
         return ''
      })

      expect(await run.kubeconform()).toBeUndefined()
      expect(core.getInput).toHaveBeenCalledTimes(3)
      expect(kubeconform.kubeconformLint).toHaveBeenCalledWith(
         ['manifest1.yaml', 'manifest2.yaml', 'manifest3.yaml'],
         '-summary'
      )
   })
})
