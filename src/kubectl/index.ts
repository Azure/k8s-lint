import { exec } from '@actions/exec';
import { which } from '@actions/io';

const TOOL_NAME = 'kubectl';

export async function kubectlLint(manifests: string[], namespace: string) {
  if (!process.env['KUBECONFIG']) {
    throw Error('KUBECONFIG env is not explicitly set.');
  }

  const kubectlPath = await which(TOOL_NAME, false);
  if (!kubectlPath) {
    throw Error('Kubectl not found. You must install it before running this action.');
  }

  for (const manifest of manifests) {
    await exec(kubectlPath, ['apply', '-f', manifest, '--dry-run=server', '--namespace', namespace]);
  }
}
