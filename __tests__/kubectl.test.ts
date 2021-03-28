import * as kubectl from '../src/kubectl';
import * as core from '@actions/core';
import * as fs from 'fs';
import * as toolCache from '@actions/tool-cache';
import * as os from 'os';
import * as path from 'path';
import { ToolRunner } from "@actions/exec/lib/toolrunner";

var mockStatusCode;
const mockExecFn = jest.fn().mockImplementation(() => mockStatusCode)
jest.mock('@actions/exec/lib/toolrunner', () => {
    return {
        ToolRunner: jest.fn().mockImplementation(() => {
            return {
                exec: mockExecFn  
            }
        })
    }
});

describe('Testing all functions in kubectl file.', () => {
    test('getkubectlDownloadURL() - return the URL to download kubectl for Linux', () => {
        jest.spyOn(os, 'type').mockReturnValue('Linux');
        const kubectlLinuxUrl = 'https://storage.googleapis.com/kubernetes-release/release/v1.15.0/bin/linux/amd64/kubectl'

        expect(kubectl.getkubectlDownloadURL('v1.15.0')).toBe(kubectlLinuxUrl);
        expect(os.type).toBeCalled();         
    });

    test('getkubectlDownloadURL() - return the URL to download kubectl for Darwin', () => {
        jest.spyOn(os, 'type').mockReturnValue('Darwin');
        const kubectlDarwinUrl = 'https://storage.googleapis.com/kubernetes-release/release/v1.15.0/bin/darwin/amd64/kubectl'

        expect(kubectl.getkubectlDownloadURL('v1.15.0')).toBe(kubectlDarwinUrl);
        expect(os.type).toBeCalled();         
    });

    test('getkubectlDownloadURL() - return the URL to download kubectl for Windows', () => {
        jest.spyOn(os, 'type').mockReturnValue('Windows_NT');

        const kubectlWindowsUrl = 'https://storage.googleapis.com/kubernetes-release/release/v1.15.0/bin/windows/amd64/kubectl.exe'
        expect(kubectl.getkubectlDownloadURL('v1.15.0')).toBe(kubectlWindowsUrl);
        expect(os.type).toBeCalled();         
    });

    test('getStableKubectlVersion() - download stable version file, read version and return it', async () => {
        jest.spyOn(toolCache, 'downloadTool').mockResolvedValue('pathToTool');
        jest.spyOn(fs, 'readFileSync').mockReturnValue('v1.20.4');

        expect(await kubectl.getStableKubectlVersion()).toBe('v1.20.4');
        expect(toolCache.downloadTool).toBeCalled();
        expect(fs.readFileSync).toBeCalledWith('pathToTool', 'utf8');
    });

    test('getStableKubectlVersion() - return default v1.18.0 if version read is empty', async () => {
        jest.spyOn(toolCache, 'downloadTool').mockResolvedValue('pathToTool');
        jest.spyOn(fs, 'readFileSync').mockReturnValue('');
        jest.spyOn(core, 'debug').mockImplementation();
        jest.spyOn(core, 'warning').mockImplementation();

        expect(await kubectl.getStableKubectlVersion()).toBe('v1.18.0');
        expect(toolCache.downloadTool).toBeCalled();
        expect(fs.readFileSync).toBeCalledWith('pathToTool', 'utf8');
    });

    test('getStableKubectlVersion() - return default v1.18.0 if unable to download file', async () => {
        jest.spyOn(toolCache, 'downloadTool').mockRejectedValue('Unable to download.');

        expect(await kubectl.getStableKubectlVersion()).toBe('v1.18.0');
        expect(toolCache.downloadTool).toBeCalled();
    });

    test('downloadKubectl() - download kubectl, add it to toolCache and return path to it', async () => {
        jest.spyOn(toolCache, 'find').mockReturnValue('');
        jest.spyOn(toolCache, 'downloadTool').mockResolvedValue('pathToTool');
        jest.spyOn(toolCache, 'cacheFile').mockResolvedValue('pathToCachedTool');
        jest.spyOn(os, 'type').mockReturnValue('Windows_NT');
        jest.spyOn(fs, 'chmodSync').mockImplementation(() => {});

        expect(await kubectl.downloadKubectl('v1.15.0')).toBe(path.join('pathToCachedTool', 'kubectl.exe'));
        expect(toolCache.find).toBeCalledWith('kubectl', 'v1.15.0');
        expect(toolCache.downloadTool).toBeCalled();
        expect(toolCache.cacheFile).toBeCalled();
        expect(os.type).toBeCalled();
        expect(fs.chmodSync).toBeCalledWith(path.join('pathToCachedTool', 'kubectl.exe'), '777');
    });

    test('downloadKubectl() - throw DownloadKubectlFailed error when unable to download kubectl', async () => {
        jest.spyOn(toolCache, 'find').mockReturnValue('');
        jest.spyOn(toolCache, 'downloadTool').mockRejectedValue('Unable to download kubectl.');

        await expect(kubectl.downloadKubectl('v1.15.0')).rejects.toThrow('DownloadKubectlFailed');
        expect(toolCache.find).toBeCalledWith('kubectl', 'v1.15.0');
        expect(toolCache.downloadTool).toBeCalled();
    });

    test('downloadKubectl() - return path to existing cache of kubectl', async () => {
        jest.spyOn(toolCache, 'find').mockReturnValue('pathToCachedTool');
        jest.spyOn(os, 'type').mockReturnValue('Windows_NT');
        jest.spyOn(fs, 'chmodSync').mockImplementation(() => {});

        expect(await kubectl.downloadKubectl('v1.15.0')).toBe(path.join('pathToCachedTool', 'kubectl.exe'));
        expect(toolCache.find).toBeCalledWith('kubectl', 'v1.15.0');
        expect(os.type).toBeCalled();
        expect(fs.chmodSync).toBeCalledWith(path.join('pathToCachedTool', 'kubectl.exe'), '777');
    });

    test('validateConnection() - check if kubeconfig is set by running sample command', async () => {
        mockStatusCode = 0;

        expect(await kubectl.validateConnection('pathToKubectl'));
        expect(ToolRunner).toBeCalledWith('pathToKubectl', ['version'], { ignoreReturnCode: true });
        expect(mockExecFn).toBeCalled();
    });

    test('validateConnection() - end the process if unable to access cluster', async () => {
        mockStatusCode = 1;
        jest.spyOn(process, "exit").mockImplementation();
        jest.spyOn(core, "setFailed").mockImplementation();
        
        expect(await kubectl.validateConnection('pathToKubectl'));
        expect(ToolRunner).toBeCalledWith('pathToKubectl', ['version'], { ignoreReturnCode: true });
        expect(mockExecFn).toBeCalled();
        expect(process.exit).toBeCalledWith(1);
        expect(core.setFailed).toBeCalledWith('Kubernetes context not set');
    });

    test('kubectlEvalLint() - download kubectl, validate connection and lint the manifests', async () => {
        jest.spyOn(toolCache, 'downloadTool').mockResolvedValue('pathToTool');
        jest.spyOn(fs, 'readFileSync').mockReturnValue('');
        jest.spyOn(toolCache, 'find').mockReturnValue('pathToCachedTool');
        jest.spyOn(os, 'type').mockReturnValue('Windows_NT');
        jest.spyOn(fs, 'chmodSync').mockImplementation(() => {});
        mockStatusCode = 0;
        
        const sampleManifests = ['manifest1.yaml', 'manifest2.yaml', 'manifest3.yaml'];
        expect(await kubectl.kubectlEvalLint(sampleManifests, 'default'));
        expect(ToolRunner).toBeCalledWith(path.join('pathToCachedTool', 'kubectl.exe'), ['apply', '-f', 'manifest1.yaml', '--dry-run=server', '--namespace', 'default']);
        expect(ToolRunner).toBeCalledWith(path.join('pathToCachedTool', 'kubectl.exe'), ['apply', '-f', 'manifest2.yaml', '--dry-run=server', '--namespace', 'default']);
        expect(ToolRunner).toBeCalledWith(path.join('pathToCachedTool', 'kubectl.exe'), ['apply', '-f', 'manifest3.yaml', '--dry-run=server', '--namespace', 'default']);
        expect(mockExecFn).toBeCalledTimes(4);
    });
}); 
