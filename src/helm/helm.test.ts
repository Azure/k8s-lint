import {beforeEach, describe, expect, test, vi} from 'vitest'

vi.mock('os')
vi.mock('node:fs')
vi.mock('@actions/exec')
vi.mock('@actions/io')
vi.mock('@actions/core')

const os = await import('os')
const fs = await import('node:fs')
const exec = await import('@actions/exec')
const io = await import('@actions/io')
const helm = await import('./helm.js')

describe('isHelmChart', () => {
   beforeEach(() => {
      vi.clearAllMocks()
   })

   test('returns true when directory contains Chart.yaml', () => {
      vi.mocked(fs.statSync).mockReturnValue({isDirectory: () => true} as any)
      vi.mocked(fs.existsSync).mockReturnValue(true)

      expect(helm.isHelmChart('charts/myapp')).toBe(true)
      expect(fs.statSync).toHaveBeenCalledWith('charts/myapp')
      expect(fs.existsSync).toHaveBeenCalledWith('charts/myapp/Chart.yaml')
   })

   test('returns false when directory does not contain Chart.yaml', () => {
      vi.mocked(fs.statSync).mockReturnValue({isDirectory: () => true} as any)
      vi.mocked(fs.existsSync).mockReturnValue(false)

      expect(helm.isHelmChart('manifests/')).toBe(false)
   })

   test('returns false for a file path', () => {
      vi.mocked(fs.statSync).mockReturnValue({isDirectory: () => false} as any)

      expect(helm.isHelmChart('deployment.yaml')).toBe(false)
   })

   test('returns false when path does not exist', () => {
      vi.mocked(fs.statSync).mockImplementation(() => {
         throw new Error('ENOENT')
      })

      expect(helm.isHelmChart('missing')).toBe(false)
   })
})

describe('renderHelmChart', () => {
   beforeEach(() => {
      vi.clearAllMocks()
      vi.mocked(os.tmpdir).mockReturnValue('/tmp')
      vi.mocked(fs.mkdtempSync).mockReturnValue('/tmp/k8s-lint-helm-abc')
      vi.mocked(fs.writeFileSync).mockImplementation(() => {})
      vi.mocked(io.which).mockResolvedValue('helm')
   })

   test('renders chart with helm template and returns path to temp file', async () => {
      vi.mocked(exec.getExecOutput).mockResolvedValue({
         stdout: 'apiVersion: v1\nkind: Pod\nmetadata:\n  name: test\n',
         stderr: '',
         exitCode: 0
      })

      const result = await helm.renderHelmChart('charts/myapp')

      expect(io.which).toHaveBeenCalledWith('helm', true)
      expect(exec.getExecOutput).toHaveBeenCalledWith(
         'helm',
         ['template', 'myapp', 'charts/myapp'],
         {silent: true}
      )
      expect(fs.mkdtempSync).toHaveBeenCalled()
      expect(fs.writeFileSync).toHaveBeenCalledWith(
         '/tmp/k8s-lint-helm-abc/rendered.yaml',
         'apiVersion: v1\nkind: Pod\nmetadata:\n  name: test\n'
      )
      expect(result).toBe('/tmp/k8s-lint-helm-abc/rendered.yaml')
   })

   test('passes --namespace when provided', async () => {
      vi.mocked(exec.getExecOutput).mockResolvedValue({
         stdout: '',
         stderr: '',
         exitCode: 0
      })

      await helm.renderHelmChart('charts/myapp', 'production')
      expect(exec.getExecOutput).toHaveBeenCalledWith(
         'helm',
         ['template', 'myapp', 'charts/myapp', '--namespace', 'production'],
         {silent: true}
      )
   })

   test('renders chart with helm.exe on Windows', async () => {
      vi.mocked(io.which).mockResolvedValue('helm.exe')
      vi.mocked(exec.getExecOutput).mockResolvedValue({
         stdout: 'apiVersion: v1\nkind: Pod\n',
         stderr: '',
         exitCode: 0
      })

      await helm.renderHelmChart('charts/myapp')
      expect(exec.getExecOutput).toHaveBeenCalledWith(
         'helm.exe',
         ['template', 'myapp', 'charts/myapp'],
         {silent: true}
      )
   })

   test('throws when helm is not on PATH', async () => {
      vi.mocked(io.which).mockRejectedValue(
         new Error('Unable to locate executable')
      )

      await expect(helm.renderHelmChart('charts/myapp')).rejects.toThrow(
         'Unable to locate executable'
      )
   })

   test('throws on helm template failure', async () => {
      vi.mocked(exec.getExecOutput).mockResolvedValue({
         stdout: '',
         stderr: 'Error: chart requires kubeVersion',
         exitCode: 1
      })

      await expect(helm.renderHelmChart('charts/myapp')).rejects.toThrow(
         'helm template failed for charts/myapp'
      )
   })
})
