import * as os from 'os';
import * as path from 'path';
import * as util from 'util';
import * as fs from 'fs';

import * as toolCache from '@actions/tool-cache';
import * as core from '@actions/core';
import { getExecutableExtension } from './utils';
import { ToolRunner } from "@actions/exec/lib/toolrunner";

const kubectlToolName = 'kubectl';
const stableKubectlVersion = 'v1.18.0';
const stableVersionUrl = 'https://storage.googleapis.com/kubernetes-release/release/stable.txt';

export function getkubectlDownloadURL(version: string): string {
    switch (os.type()) {
        case 'Linux':
            return util.format('https://storage.googleapis.com/kubernetes-release/release/%s/bin/linux/amd64/kubectl', version);

        case 'Darwin':
            return util.format('https://storage.googleapis.com/kubernetes-release/release/%s/bin/darwin/amd64/kubectl', version);

        case 'Windows_NT':
        default:
            return util.format('https://storage.googleapis.com/kubernetes-release/release/%s/bin/windows/amd64/kubectl.exe', version);

    }
}

export async function getStableKubectlVersion(): Promise<string> {
    return toolCache.downloadTool(stableVersionUrl).then((downloadPath) => {
        let version = fs.readFileSync(downloadPath, 'utf8').toString().trim();
        if (!version) {
            version = stableKubectlVersion;
        }
        return version;
    }, (error) => {
        core.debug(error);
        core.warning('GetStableVersionFailed');
        return stableKubectlVersion;
    });
}

export async function downloadKubectl(version: string): Promise<string> {
    let cachedToolpath = toolCache.find(kubectlToolName, version);
    let kubectlDownloadPath = '';
    if (!cachedToolpath) {
        try {
            kubectlDownloadPath = await toolCache.downloadTool(getkubectlDownloadURL(version));
        } catch (exception) {
            throw new Error('DownloadKubectlFailed');
        }

        cachedToolpath = await toolCache.cacheFile(kubectlDownloadPath, kubectlToolName + getExecutableExtension(), kubectlToolName, version);
    }

    const kubectlPath = path.join(cachedToolpath, kubectlToolName + getExecutableExtension());
    fs.chmodSync(kubectlPath, '777');
    return kubectlPath;
}

export async function validateConnection(toolPath: string) {
    let toolRunner = new ToolRunner(toolPath, ['version'], { ignoreReturnCode: true });
    const code = await toolRunner.exec();
    if (code) {
        core.setFailed("Kubernetes context not set");
        process.exit(1);
    }
}

export async function kubectlEvalLint(manifests: string[], namespace: string) {
    let toolPath = await downloadKubectl(await getStableKubectlVersion());
    await validateConnection(toolPath);
    for (let i = 0; i < manifests.length; i++) {
        const manifest = manifests[i];
        let toolRunner = new ToolRunner(toolPath, ['apply', '-f', manifest, '--dry-run=server', '--namespace', namespace]);
        await toolRunner.exec();
    }
}
