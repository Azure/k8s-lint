import * as kubeval from '../src/kubeval'
import * as core from '@actions/core';
import * as fs from 'fs';
import * as toolCache from '@actions/tool-cache';
import * as io from '@actions/io';
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

describe('Testing all functions in kubeval file.', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('getkubectlDownloadURL() - return url to download kubeval for Linux', () => {
        jest.spyOn(os, 'type').mockReturnValue('Linux');

        expect(kubeval.getkubevalDownloadURL()).toBe('https://github.com/instrumenta/kubeval/releases/latest/download/kubeval-linux-amd64.tar.gz');
        expect(os.type).toBeCalled();         
    });

    test('getkubectlDownloadURL() - return url to download kubeval for Darwin', () => {
        jest.spyOn(os, 'type').mockReturnValue('Darwin');

        expect(kubeval.getkubevalDownloadURL()).toBe('https://github.com/instrumenta/kubeval/releases/latest/download/kubeval-darwin-amd64.tar.gz');
        expect(os.type).toBeCalled();         
    });

    test('getkubectlDownloadURL() - return url to download kubeval for Windows', () => {
        jest.spyOn(os, 'type').mockReturnValue('Windows_NT');

        expect(kubeval.getkubevalDownloadURL()).toBe('https://github.com/instrumenta/kubeval/releases/latest/download/kubeval-windows-amd64.zip');
        expect(os.type).toBeCalled();         
    });

    test('downloadKubeval() - download kubeval, extract zip it and return path to it', async () => {
        jest.spyOn(os, 'type').mockReturnValue('Windows_NT');
        jest.spyOn(toolCache, 'downloadTool').mockResolvedValue('pathToTool');
        jest.spyOn(toolCache, 'extractZip').mockResolvedValue('pathToExtractedTool');
        jest.spyOn(fs, 'chmodSync').mockImplementation();
        jest.spyOn(core, 'addPath').mockImplementation();

        expect(await kubeval.downloadKubeval()).toBe(path.join('pathToExtractedTool', 'kubeval.exe'));
        expect(os.type).toBeCalled();
        expect(toolCache.downloadTool).toBeCalled();
        expect(toolCache.extractZip).toBeCalledWith('pathToTool');         
        expect(fs.chmodSync).toBeCalledWith(path.join('pathToExtractedTool', 'kubeval.exe'), '777');         
        expect(core.addPath).toBeCalledWith('pathToExtractedTool');         
    });

    test('downloadKubeval() - download kubeval, extract tar it and return path to it', async () => {
        jest.spyOn(os, 'type').mockReturnValue('Linux');
        jest.spyOn(toolCache, 'downloadTool').mockResolvedValue(path.join('pathToToolDir', 'tool'));
        jest.spyOn(io, 'cp').mockImplementation();
        jest.spyOn(toolCache, 'extractTar').mockResolvedValue('pathToExtractedTool');
        jest.spyOn(fs, 'chmodSync').mockImplementation();
        jest.spyOn(core, 'addPath').mockImplementation();

        expect(await kubeval.downloadKubeval()).toBe(path.join('pathToExtractedTool', 'kubeval'));
        expect(os.type).toBeCalled();         
        expect(toolCache.downloadTool).toBeCalled();         
        expect(io.cp).toBeCalledWith(path.join('pathToToolDir', 'tool'), path.join('pathToToolDir', 'tool.tar.gz'));         
        expect(toolCache.extractTar).toBeCalledWith(path.join('pathToToolDir', 'tool.tar.gz'));         
        expect(fs.chmodSync).toBeCalledWith(path.join('pathToExtractedTool', 'kubeval'), '777');         
        expect(core.addPath).toBeCalledWith('pathToExtractedTool');
    });

    test('downloadKubeval() - throw error if downloadTool fails', async () => {
        jest.spyOn(os, 'type').mockReturnValue('Windows_NT');
        jest.spyOn(toolCache, 'downloadTool').mockRejectedValue('Unable to download');

        await expect(kubeval.downloadKubeval()).rejects.toThrow('Download Kubeval Failed');
        expect(os.type).toBeCalled();
        expect(toolCache.downloadTool).toBeCalled();
    });

    test('kubeEvalLint() - get path to kubeval and use it on manifests', async () => {
        jest.spyOn(io, 'which').mockResolvedValue('pathToTool');
        mockStatusCode = 0;

        const sampleManifests = ['manifest1.yaml', 'manifest2.yaml', 'manifest3.yaml'];
        expect(await kubeval.kubeEvalLint(sampleManifests)).toBeUndefined();
        expect(io.which).toBeCalledWith('kubeval', true);         
        expect(ToolRunner).toBeCalledWith('pathToTool', ['manifest1.yaml']);
        expect(ToolRunner).toBeCalledWith('pathToTool', ['manifest2.yaml']);
        expect(ToolRunner).toBeCalledWith('pathToTool', ['manifest3.yaml']);
        expect(mockExecFn).toBeCalledTimes(3);
    });

    test('kubeEvalLint() - see if kubeval is already installed, else download and use it on manifests', async () => {
        jest.spyOn(io, 'which').mockRejectedValue('');
        jest.spyOn(os, 'type').mockReturnValue('Windows_NT');
        jest.spyOn(toolCache, 'downloadTool').mockResolvedValue('pathToTool');
        jest.spyOn(toolCache, 'extractZip').mockResolvedValue('pathToExtractedTool');
        jest.spyOn(fs, 'chmodSync').mockImplementation();
        jest.spyOn(core, 'addPath').mockImplementation();
        mockStatusCode = 0;

        const sampleManifests = ['manifest1.yaml', 'manifest2.yaml', 'manifest3.yaml'];
        expect(await kubeval.kubeEvalLint(sampleManifests)).toBeUndefined();
        expect(io.which).toBeCalledWith('kubeval', true);         
        expect(ToolRunner).toBeCalledWith(path.join('pathToExtractedTool', 'kubeval.exe'), ['manifest1.yaml']);
        expect(ToolRunner).toBeCalledWith(path.join('pathToExtractedTool', 'kubeval.exe'), ['manifest2.yaml']);
        expect(ToolRunner).toBeCalledWith(path.join('pathToExtractedTool', 'kubeval.exe'), ['manifest3.yaml']);
        expect(mockExecFn).toBeCalledTimes(3);
    });

    test('kubeEvalLint() - set core failed if kubeval fails on a manifest', async () => {
        jest.spyOn(io, 'which').mockResolvedValue('pathToTool');
        jest.spyOn(core, 'setFailed').mockImplementation(() => {});
        mockStatusCode = 1;

        const sampleManifests = ['manifest1.yaml'];
        expect(await kubeval.kubeEvalLint(sampleManifests)).toBeUndefined();
        expect(io.which).toBeCalledWith('kubeval', true);         
        expect(ToolRunner).toBeCalledWith('pathToTool', ['manifest1.yaml']);
        expect(mockExecFn).toBeCalledTimes(1);
    });
});