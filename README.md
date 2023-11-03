# k8s-lint action

GitHub Action to validate Kubernetes manifests.

Refer to the [action metadata file](./action.yml) for details about the inputs.

## Lint using `kubeconform`

```yaml
- uses: azure/k8s-lint@v1
  with:
    manifests: |
      manifests/deployment.yml
      manifests/service.yml
    kubeconform-options: -summary
```

## Lint using Kubernetes server dry-run

Requires `kubectl` to be installed (you can use the [Azure/setup-kubectl](https://github.com/Azure/setup-kubectl) action).
Server dry-run will communicate with the Kubernetes server, so ensure that `KUBECONFIG` is available in the context.
This works only for kubernetes versions >=1.12

```yaml
- uses: azure/setup-kubectl@v2
- uses: azure/k8s-lint@v1
  with:
    lint-type: dry-run
    manifests: |
      manifests/deployment.yml
      manifests/service.yml
```
