import {describe, expect, test, vi} from 'vitest'

const coreMockState = vi.hoisted(() => ({
   getInput: vi.fn<(name: string) => string>()
}))

const kubeconformMockState = vi.hoisted(() => ({
   kubeconformLint: vi.fn(async () => undefined)
}))

const kubectlMockState = vi.hoisted(() => ({
   kubectlLint: vi.fn(async () => undefined)
}))

vi.mock('@actions/core', () => ({
   getInput: coreMockState.getInput
}))

vi.mock('./kubeconform/kubeconform', () => ({
   kubeconformLint: kubeconformMockState.kubeconformLint
}))

vi.mock('./kubectl/kubectl', () => ({
   kubectlLint: kubectlMockState.kubectlLint
}))

import * as run from './run'

describe('run', () => {
   test('runs kubectl dry run based on input', async () => {
      coreMockState.getInput.mockImplementation((input) => {
         if (input == 'manifests')
            return 'manifest1.yaml\nmanifest2.yaml\nmanifest3.yaml'
         if (input == 'lintType') return 'dryrun'
         if (input == 'namespace') return 'sampleNamespace'
         return ''
      })

      expect(await run.kubeconform()).toBeUndefined()
      expect(coreMockState.getInput).toHaveBeenCalledTimes(3)
      expect(kubectlMockState.kubectlLint).toHaveBeenCalledWith(
         ['manifest1.yaml', 'manifest2.yaml', 'manifest3.yaml'],
         'sampleNamespace'
      )
   })

   test('uses default namespace if input not given', async () => {
      coreMockState.getInput.mockImplementation((input) => {
         if (input == 'manifests')
            return 'manifest1.yaml\nmanifest2.yaml\nmanifest3.yaml'
         if (input == 'lintType') return 'dryrun'
         if (input == 'namespace') return ''
         return ''
      })

      expect(await run.kubeconform()).toBeUndefined()
      expect(coreMockState.getInput).toHaveBeenCalledTimes(3)
      expect(kubectlMockState.kubectlLint).toHaveBeenCalledWith(
         ['manifest1.yaml', 'manifest2.yaml', 'manifest3.yaml'],
         'default'
      )
   })

   test('runs kubeconform on manifests based on input', async () => {
      coreMockState.getInput.mockImplementation((input) => {
         if (input == 'manifests')
            return 'manifest1.yaml\nmanifest2.yaml\nmanifest3.yaml'
         if (input == 'lintType') return 'kubeconform'
         if (input == 'kubeconformOpts') return '-summary'
         return ''
      })

      expect(await run.kubeconform()).toBeUndefined()
      expect(coreMockState.getInput).toHaveBeenCalledTimes(3)
      expect(kubeconformMockState.kubeconformLint).toHaveBeenCalledWith(
         ['manifest1.yaml', 'manifest2.yaml', 'manifest3.yaml'],
         '-summary'
      )
   })

   test('uses -summary option if input not given', async () => {
      coreMockState.getInput.mockImplementation((input) => {
         if (input == 'manifests')
            return 'manifest1.yaml\nmanifest2.yaml\nmanifest3.yaml'
         if (input == 'lintType') return 'kubeconform'
         if (input == 'kubeconformOpts') return ''
         return ''
      })

      expect(await run.kubeconform()).toBeUndefined()
      expect(coreMockState.getInput).toHaveBeenCalledTimes(3)
      expect(kubeconformMockState.kubeconformLint).toHaveBeenCalledWith(
         ['manifest1.yaml', 'manifest2.yaml', 'manifest3.yaml'],
         '-summary'
      )
   })
})
