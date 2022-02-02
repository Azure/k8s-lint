import * as run from "../src/run";
import * as kubeval from "./kubeval/kubeval";
import * as kubectl from "./kubectl/kubectl";
import * as core from "@actions/core";

describe("run", () => {
  test("runs kubectl dry run based on input", async () => {
    jest.spyOn(core, "getInput").mockImplementation((input) => {
      if (input == "manifests")
        return "manifest1.yaml\nmanifest2.yaml\nmanifest3.yaml";
      if (input == "lintType") return "dryrun";
      if (input == "namespace") return "sampleNamespace";
    });
    jest.spyOn(kubectl, "kubectlLint").mockImplementation();

    expect(await run.kubeval()).toBeUndefined();
    expect(core.getInput).toBeCalledTimes(3);
    expect(kubectl.kubectlLint).toBeCalledWith(
      ["manifest1.yaml", "manifest2.yaml", "manifest3.yaml"],
      "sampleNamespace"
    );
  });

  test("uses default namespace if input not given", async () => {
    jest.spyOn(core, "getInput").mockImplementation((input) => {
      if (input == "manifests")
        return "manifest1.yaml\nmanifest2.yaml\nmanifest3.yaml";
      if (input == "lintType") return "dryrun";
      if (input == "namespace") return "";
    });
    jest.spyOn(kubectl, "kubectlLint").mockImplementation();

    expect(await run.kubeval()).toBeUndefined();
    expect(core.getInput).toBeCalledTimes(3);
    expect(kubectl.kubectlLint).toBeCalledWith(
      ["manifest1.yaml", "manifest2.yaml", "manifest3.yaml"],
      "default"
    );
  });

  test("runs kubeval on manifests based on input", async () => {
    jest.spyOn(core, "getInput").mockImplementation((input) => {
      if (input == "manifests")
        return "manifest1.yaml\nmanifest2.yaml\nmanifest3.yaml";
      if (input == "lintType") return "kubeval";
    });
    jest.spyOn(kubeval, "kubevalLint").mockImplementation();

    expect(await run.kubeval()).toBeUndefined();
    expect(core.getInput).toBeCalledTimes(2);
    expect(kubeval.kubevalLint).toBeCalledWith([
      "manifest1.yaml",
      "manifest2.yaml",
      "manifest3.yaml",
    ]);
  });
});
