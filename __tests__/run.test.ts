import * as run from '../src/run'
import * as kubeval from '../src/kubeval'
import * as kubectl from '../src/kubectl';
import * as core from '@actions/core';

describe('Testing all functions in run file.', () => {
    test('kubeval() - run kubectl dry run based on input', async () => {
        jest.spyOn(core, 'getInput').mockImplementation((input) => {
            if (input == 'manifests') return 'manifest1.yaml\nmanifest2.yaml\nmanifest3.yaml';
            if (input == 'lintType') return 'dryrun';
            if (input == 'namespace') return 'sampleNamespace';
        });
        jest.spyOn(kubectl, 'kubectlEvalLint').mockImplementation();

        expect(await run.kubeval()).toBeUndefined();
        expect(core.getInput).toBeCalledTimes(3);
        expect(kubectl.kubectlEvalLint).toBeCalledWith(['manifest1.yaml', 'manifest2.yaml', 'manifest3.yaml'], 'sampleNamespace');
    });
    
    test('kubeval() - use default namespace if input not given', async () => {
        jest.spyOn(core, 'getInput').mockImplementation((input) => {
            if (input == 'manifests') return 'manifest1.yaml\nmanifest2.yaml\nmanifest3.yaml';
            if (input == 'lintType') return 'dryrun';
            if (input == 'namespace') return '';
        });
        jest.spyOn(kubectl, 'kubectlEvalLint').mockImplementation();

        expect(await run.kubeval()).toBeUndefined();
        expect(core.getInput).toBeCalledTimes(3);
        expect(kubectl.kubectlEvalLint).toBeCalledWith(['manifest1.yaml', 'manifest2.yaml', 'manifest3.yaml'], 'default');
    });

    test('kubeval() - run kubeval on manifests based on input', async () => {
        jest.spyOn(core, 'getInput').mockImplementation((input) => {
            if (input == 'manifests') return 'manifest1.yaml\nmanifest2.yaml\nmanifest3.yaml';
            if (input == 'lintType') return 'kubeval';
        });
        jest.spyOn(kubeval, 'kubeEvalLint').mockImplementation();

        expect(await run.kubeval()).toBeUndefined();
        expect(core.getInput).toBeCalledTimes(2);
        expect(kubeval.kubeEvalLint).toBeCalledWith(['manifest1.yaml', 'manifest2.yaml', 'manifest3.yaml']);
    });
});