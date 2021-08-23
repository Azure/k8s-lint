import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

import * as toolCache from '@actions/tool-cache';
import * as core from '@actions/core';
import * as io from '@actions/io';
import { ToolRunner } from "@actions/exec/lib/toolrunner";

import { getExecutableExtension } from './utils';

const toolName = 'kubeval';

export function getkubevalDownloadURL(): string {
    switch (os.type()) {
        case 'Linux':
            return "https://github.com/instrumenta/kubeval/releases/latest/download/kubeval-linux-amd64.tar.gz";

        case 'Darwin':
            return "https://github.com/instrumenta/kubeval/releases/latest/download/kubeval-darwin-amd64.tar.gz";

        case 'Windows_NT':
        default:
            return "https://github.com/instrumenta/kubeval/releases/latest/download/kubeval-windows-amd64.zip";
    }
}

export async function downloadKubeval(): Promise<string> {
    let kubevalDownloadPath = '';
    try {
        kubevalDownloadPath = await toolCache.downloadTool(getkubevalDownloadURL());
        if (os.type() !== 'Windows_NT') {
            await io.cp(kubevalDownloadPath, path.join(path.dirname(kubevalDownloadPath), 'tool.tar.gz'));
            kubevalDownloadPath = path.join(path.dirname(kubevalDownloadPath), 'tool.tar.gz');
        }
        switch (os.type()) {
            case 'Linux':
            case 'Darwin':
                kubevalDownloadPath = await toolCache.extractTar(kubevalDownloadPath);
                break;
            case 'Windows_NT':
            default:
                kubevalDownloadPath = await toolCache.extractZip(kubevalDownloadPath);
        }
    } catch (exception) {
        throw new Error('Download Kubeval Failed');
    }

    const kubevalPath = path.join(kubevalDownloadPath, toolName + getExecutableExtension());
    fs.chmodSync(kubevalPath, '777');
    core.addPath(kubevalDownloadPath);
    return kubevalPath;
}

export async function kubeEvalLint(manifests: string[]) {
    let toolPath;
    try {
        toolPath = await io.which(toolName, true);
    }
    catch (ex) {
        toolPath = await downloadKubeval();
    }

    for (let i = 0; i < manifests.length; i++) {
        const manifest = manifests[i];
        let toolRunner = new ToolRunner(toolPath, [manifest]);
        const code = await toolRunner.exec();
        if (code != 0) {
            core.setFailed('Your manifests have some errors');
        }
    }
}