import * as os from "os";
import * as path from "path";
import * as fs from "fs";
import * as toolCache from "@actions/tool-cache";
import * as core from "@actions/core";
import * as io from "@actions/io";
import { ToolRunner } from "@actions/exec/lib/toolrunner";
import { getExecutableExtension } from "../utils";

const TOOL_NAME = "kubeval";

export async function kubevalLint(manifests: string[]) {
  const toolPath =
    (await io.which(TOOL_NAME, false)) || (await downloadKubeval());

  for (const manifest of manifests) {
    const toolRunner = new ToolRunner(toolPath, [manifest]);
    const code = await toolRunner.exec();

    if (code != 0) {
      throw Error("Your manifest has errors");
    }
  }
}

export async function downloadKubeval(): Promise<string> {
  const downloadPath = await toolCache.downloadTool(getKubevalDownloadUrl());

  // extract from download
  let extractedPath;
  switch (os.type()) {
    case "Linux":
    case "Darwin":
      const newPath = path.join(path.dirname(downloadPath), "tool.tar.gz");
      await io.cp(downloadPath, newPath);
      extractedPath = await toolCache.extractTar(newPath);
      break;
    case "Windows_NT":
    default:
      extractedPath = await toolCache.extractZip(downloadPath);
  }

  // get and make executable
  const kubevalPath = path.join(
    extractedPath,
    TOOL_NAME + getExecutableExtension()
  );
  fs.chmodSync(kubevalPath, "777");
  core.addPath(extractedPath);
  return kubevalPath;
}

export function getKubevalDownloadUrl(): string {
  switch (os.type()) {
    case "Linux":
      return "https://github.com/instrumenta/kubeval/releases/latest/download/kubeval-linux-amd64.tar.gz";

    case "Darwin":
      return "https://github.com/instrumenta/kubeval/releases/latest/download/kubeval-darwin-amd64.tar.gz";

    case "Windows_NT":
    default:
      return "https://github.com/instrumenta/kubeval/releases/latest/download/kubeval-windows-amd64.zip";
  }
}
