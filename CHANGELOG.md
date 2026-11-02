# Changelog

## [5.1.0] - 2026-06-22

### Added

- `getPlatform()`, `getArch()`, `getArchiveExtension()` shared helpers extracted to `utils.ts`, used by both helm and kubeconform modules

### Changed

- Helm code moved from `src/utils.ts` to dedicated `src/helm/helm.ts` module, matching the existing `src/kubeconform/` and `src/kubectl/` structure
- Remaining `os.type()` calls replaced with the shared `getPlatform()` helper

## [5.0.0] - 2026-06-18

### Added

- Helm chart directories are now auto-detected (via `Chart.yaml`) and rendered with `helm template` before linting — pass the chart path directly in the `manifests` input

## [4.2.0] - 2026-06-18

### Added

- Glob patterns and directories are now supported in the `manifests` input — entries like `kubernetes/*.yaml` or `manifests/` are expanded to matching files automatically

## [4.1.0] - 2026-06-18

### Fixed

- Split `kubeconformOpts` string into separate arguments so multiple flags (e.g. `-summary -strict`) are passed correctly to kubeconform

## [4.0.0] - 2026-04-20

### Changed

- #189 [Update Node.js runtime from node20 to node24](https://github.com/Azure/k8s-lint/pull/189)
- #198 [build: migrate action to ESM with esbuild and Vitest](https://github.com/Azure/k8s-lint/pull/198)
- **Dependabot - GitHub Actions workflow updates:** bumps to `github/codeql-action`, `actions/setup-node`, and other workflow actions in #145, #147, #148, #150, #152, #156, #158, #160, #167, #169, #171, #173, #175, #177, #179, #181, #183, #185, #187, #188, #193, #197
- **Dependabot - npm dependency updates:** `@types/node` (#144, #146, #159, #166, #174), `undici` / `@actions/http-client` (#184, #191), `jest` (#149), `handlebars` (#196), `picomatch` (#195), `minimatch` (#186), `js-yaml` (#163), `glob` (#165), and grouped npm `actions` updates in #151, #155, #157, #164, #168, #170, #172, #176, #178

## [3.0.1] - 2025-08-12

### Changed

- #94 [Depencies Update Plus Integration Tests Fix](https://github.com/Azure/k8s-lint/pull/94)
- #95 [Add code quality analysis for this repo as standard.](https://github.com/Azure/k8s-lint/pull/95)
- #97 [Pin SHA for security and stability](https://github.com/Azure/k8s-lint/pull/97)
- #103 [Strengthening GitHub Workflow Security: Token Permissions & Dependencies](https://github.com/Azure/k8s-lint/pull/103)
- #130 [Fix the major update packages including Jest.](https://github.com/Azure/k8s-lint/pull/130)
- #132 [Add husky pre-commit hook.](https://github.com/Azure/k8s-lint/pull/132)

## [3.0.0] - 2024-08-21

### Changed

- Updated to Azure release workflows
- Upgrade to node 20 from 16
