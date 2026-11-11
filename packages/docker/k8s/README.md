# Kubernetes

> DISCLAIMER: The k8s and podman deployments are provided and maintained by the community. The core team maintains Docker Compose deployment in this repository. Use these Kubernetes files at your own risk.

## Contents

- `manifests/` - legacy raw Kubernetes manifests for server / worker / db / redis.
- `terraform/` - basic Terraform files for deploying the manifests onto a Kubernetes cluster.

## Helm

The recommended Kubernetes path is the Helm chart at `helm/twenty`. It supersedes the raw manifests in `k8s/manifests`.

## Prerequisites

- A Kubernetes cluster (minikube, kind, EKS, GKE, etc.)
- `kubectl`
- `helm v3`
- `terraform`
- Docker, for local image builds if needed

## Quick start (recommended)

```sh
export DOMAIN=depose.example.com
helm install depose packages/docker/helm/twenty \
  --namespace depose --create-namespace --wait \
  --set server.ingress.hosts[0].host=$DOMAIN \
  --set server.ingress.hosts[0].paths[0].path=/ \
  --set server.ingress.hosts[0].paths[0].pathType=Prefix \
  --set server.ingress.tls[0].hosts[0]=$DOMAIN
```

See `helm/twenty/README.md` for the full list of values.
