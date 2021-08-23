# Kubernetes lint action

Use this action to lint/validate your manifest files.

#### Lint using kubeval
```yaml
- uses: azure/k8s-lint@v1
  with:
    manifests: |
        manifests/deployment.yml
        manifests/service.yml
```

#### Lint using kubernetes server dryrun

Server dryrun would communicate with the kuberenetes server, so ensure that KUBECONFIG is available in the context.
This works only for kubernetes versions >=1.12

```yaml
- uses: azure/k8s-lint@v1
  with:
    lintType: dryrun
    manifests: |
        manifests/deployment.yml
        manifests/service.yml     
```

Refer to the action metadata file for details about all the inputs https://github.com/Azure/k8s-lint/blob/master/action.yml

# Contributing

This project welcomes contributions and suggestions.  Most contributions require you to agree to a
Contributor License Agreement (CLA) declaring that you have the right to, and actually do, grant us
the rights to use your contribution. For details, visit https://cla.opensource.microsoft.com.

When you submit a pull request, a CLA bot will automatically determine whether you need to provide
a CLA and decorate the PR appropriately (e.g., status check, comment). Simply follow the instructions
provided by the bot. You will only need to do this once across all repos using our CLA.

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.
