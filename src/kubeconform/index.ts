import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { addPath } from '@actions/core';
import { exec } from '@actions/exec';
import { cp, which } from '@actions/io';
import { downloadTool, extractTar, extractZip } from '@actions/tool-cache';

import { getExecutableExtension } from '../utils.js';

const TOOL_NAME = 'kubeconform';

export function getKubeconformArch(): string {
  const arch = os.arch();
  if (arch === 'x64') {
    return 'amd64';
  }

  return arch;
}

export async function kubeconformLint(manifests: string[], kubeconformOptions: string) {
  const toolPath = (await which(TOOL_NAME, false)) || (await downloadKubeconform());
  for (const manifest of manifests) {
    const code = await exec(toolPath, [kubeconformOptions, manifest]);

    if (code != 0) {
      throw Error('Your manifest has errors');
    }
  }
}

export async function downloadKubeconform(): Promise<string> {
  const runnerArch = getKubeconformArch();
  const downloadPath = await downloadTool(getKubeconformDownloadUrl(runnerArch));

  // extract from download
  let extractedPath;
  switch (os.type()) {
    case 'Linux':
    case 'Darwin':
      {
        const newPath = path.join(path.dirname(downloadPath), 'tool.tar.gz');
        await cp(downloadPath, newPath);
        extractedPath = await extractTar(newPath);
      }
      break;

    case 'Windows_NT':
    default:
      extractedPath = await extractZip(downloadPath);
      break;
  }

  // get and make executable
  const kubeconformPath = path.join(extractedPath, TOOL_NAME + getExecutableExtension());
  fs.chmodSync(kubeconformPath, '755');
  addPath(extractedPath);
  return kubeconformPath;
}

export function getKubeconformDownloadUrl(arch: string): string {
  switch (os.type()) {
    case 'Linux':
      return `https://github.com/yannh/kubeconform/releases/latest/download/kubeconform-linux-${arch}.tar.gz`;

    case 'Darwin':
      return `https://github.com/yannh/kubeconform/releases/latest/download/kubeconform-darwin-${arch}.tar.gz`;

    case 'Windows_NT':
    default:
      return `https://github.com/yannh/kubeconform/releases/latest/download/kubeconform-windows-${arch}.zip`;
  }
}
