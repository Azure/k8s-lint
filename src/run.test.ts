import {describe, expect, test, vi, beforeEach} from 'vitest'

vi.mock('@actions/core')
vi.mock('./kubeconform/kubeconform.js')
vi.mock('./kubectl/kubectl.js')
vi.mock('node:fs', async (importOriginal) => ({
   ...(await importOriginal<typeof import('node:fs')>()),
   globSync: vi.fn(),
   statSync: vi.fn(),
   existsSync: vi.fn(),
   mkdtempSync: vi.fn(),
   writeFileSync: vi.fn()
}))
vi.mock('@actions/exec', () => ({
   getExecOutput: vi.fn()
}))
vi.mock('os', async (importOriginal) => ({
   ...(await importOriginal<typeof import('os')>()),
   tmpdir: vi.fn()
}))
vi.mock('@actions/io', () => ({
   which: vi.fn(),
   cp: vi.fn()
}))

const core = await import('@actions/core')
const kubeconform = await import('./kubeconform/kubeconform.js')
const kubectl = await import('./kubectl/kubectl.js')
const exec = await import('@actions/exec')
const run = await import('./run.js')
const fs = await import('node:fs')
const os = await import('os')
const io = await import('@actions/io')

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
      expect(core.getInput).toHaveBeenCalledTimes(4)
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
      expect(core.getInput).toHaveBeenCalledTimes(4)
      expect(kubeconform.kubeconformLint).toHaveBeenCalledWith(
         ['manifest1.yaml', 'manifest2.yaml', 'manifest3.yaml'],
         '-summary'
      )
   })

   test('expands glob patterns in manifests input', async () => {
      vi.mocked(core.getInput).mockImplementation((input) => {
         if (input == 'manifests') return 'kubernetes/*.yaml'
         if (input == 'lintType') return 'kubeconform'
         if (input == 'kubeconformOpts') return '-summary'
         return ''
      })
      vi.mocked(fs.globSync).mockReturnValue([
         'kubernetes/deployment.yaml',
         'kubernetes/service.yaml'
      ] as any)

      expect(await run.kubeconform()).toBeUndefined()
      expect(core.getInput).toHaveBeenCalledTimes(4)
      expect(kubeconform.kubeconformLint).toHaveBeenCalledWith(
         ['kubernetes/deployment.yaml', 'kubernetes/service.yaml'],
         '-summary'
      )
   })

   test('throws when no manifests are found after expansion', async () => {
      vi.mocked(core.getInput).mockImplementation((input) => {
         if (input == 'manifests') return ''
         if (input == 'lintType') return 'kubeconform'
         if (input == 'kubeconformOpts') return '-summary'
         return ''
      })

      await expect(run.kubeconform()).rejects.toThrow(
         'No valid manifest files found to lint'
      )
   })

   test('renders Helm chart and lints the rendered output', async () => {
      vi.mocked(core.getInput).mockImplementation((input) => {
         if (input == 'manifests') return 'charts/myapp'
         if (input == 'lintType') return 'kubeconform'
         if (input == 'kubeconformOpts') return '-summary'
         if (input == 'namespace') return ''
         return ''
      })
      vi.mocked(fs.statSync).mockReturnValue({isDirectory: () => true} as any)
      vi.mocked(fs.existsSync).mockReturnValue(true) // Chart.yaml present
      vi.mocked(fs.mkdtempSync).mockReturnValue('/tmp/k8s-lint-helm-abc')
      vi.mocked(fs.writeFileSync).mockImplementation(() => {})
      vi.mocked(exec.getExecOutput).mockResolvedValue({
         stdout: 'apiVersion: v1\nkind: Pod\n',
         stderr: '',
         exitCode: 0
      })
      vi.mocked(os.tmpdir).mockReturnValue('/tmp')
      vi.mocked(io.which).mockResolvedValue('/usr/local/bin/helm')

      expect(await run.kubeconform()).toBeUndefined()
      expect(exec.getExecOutput).toHaveBeenCalledWith(
         '/usr/local/bin/helm',
         ['template', 'myapp', 'charts/myapp', '--namespace', 'default'],
         {silent: true}
      )
      expect(kubeconform.kubeconformLint).toHaveBeenCalledWith(
         ['/tmp/k8s-lint-helm-abc/rendered.yaml'],
         '-summary'
      )
   })
})
