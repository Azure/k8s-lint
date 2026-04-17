import {beforeEach, describe, expect, test, vi} from 'vitest'
import * as path from 'path'

vi.mock('@actions/io')
vi.mock('@actions/exec')

const io = await import('@actions/io')
const actionsExec = await import('@actions/exec')
const kubectl = await import('./kubectl.js')

describe('Kubectl', () => {
   beforeEach(() => {
      vi.clearAllMocks()
   })

   test('throws if kubeconfig not set', async () => {
      delete process.env['KUBECONFIG']
      await expect(kubectl.kubectlLint([], 'default')).rejects.toThrow()
   })

   test("throws if kubectl can't be found", async () => {
      process.env['KUBECONFIG'] = 'kubeconfig'
      vi.mocked(io.which).mockResolvedValue('')
      await expect(kubectl.kubectlLint([], 'default')).rejects.toThrow()
   })

   test('gets kubectl, validates kubeconfig, and lints the manifests', async () => {
      process.env['KUBECONFIG'] = 'kubeconfig'
      const pathToTool = 'pathToTool'
      vi.mocked(io.which).mockResolvedValue(
         path.join(pathToTool, 'kubectl.exe')
      )
      vi.mocked(actionsExec.exec).mockResolvedValue(0)

      const sampleManifests = [
         'manifest1.yaml',
         'manifest2.yaml',
         'manifest3.yaml'
      ]
      expect(await kubectl.kubectlLint(sampleManifests, 'default'))
      expect(actionsExec.exec).toHaveBeenCalledWith(
         path.join(pathToTool, 'kubectl.exe'),
         [
            'apply',
            '-f',
            'manifest1.yaml',
            '--dry-run=server',
            '--namespace',
            'default'
         ]
      )
      expect(actionsExec.exec).toHaveBeenCalledWith(
         path.join(pathToTool, 'kubectl.exe'),
         [
            'apply',
            '-f',
            'manifest2.yaml',
            '--dry-run=server',
            '--namespace',
            'default'
         ]
      )
      expect(actionsExec.exec).toHaveBeenCalledWith(
         path.join(pathToTool, 'kubectl.exe'),
         [
            'apply',
            '-f',
            'manifest3.yaml',
            '--dry-run=server',
            '--namespace',
            'default'
         ]
      )
      expect(actionsExec.exec).toHaveBeenCalledTimes(3)
   })
})
