import * as kubectl from './kubectl'
import * as io from '@actions/io'
import * as actionsExec from '@actions/exec'
import * as path from 'path'
import {beforeEach, describe, expect, test, vi} from 'vitest'

const execMockState = vi.hoisted(() => {
   const state = {
      statusCode: 0,
      exec: vi.fn(async () => state.statusCode)
   }

   return state
})

const ioMockState = vi.hoisted(() => ({
   which: vi.fn(async () => '')
}))

vi.mock('@actions/io', () => {
   return {
      which: ioMockState.which
   }
})

vi.mock('@actions/exec', () => {
   return {
      exec: execMockState.exec
   }
})

describe('Kubectl', () => {
   beforeEach(() => {
      vi.clearAllMocks()
   })

   test('throws if kubeconfig not set', async () => {
      await expect(kubectl.kubectlLint([], 'default')).rejects.toThrow()
   })

   test("throws if kubectl can't be found", async () => {
      process.env['KUBECONFIG'] = 'kubeconfig'
      ioMockState.which.mockResolvedValue('')
      await expect(kubectl.kubectlLint([], 'default')).rejects.toThrow()
   })

   test('gets kubectl, validates kubeconfig, and lints the manifests', async () => {
      process.env['KUBECONFIG'] = 'kubeconfig'
      const pathToTool = 'pathToTool'
      ioMockState.which.mockResolvedValue(path.join(pathToTool, 'kubectl.exe'))
      execMockState.statusCode = 0

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
      expect(execMockState.exec).toHaveBeenCalledTimes(3)
   })
})
