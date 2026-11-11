# Kubernetes manifests (legacy)

These are raw Kubernetes manifests kept for reference. For new deployments, prefer the Helm chart at `helm/twenty`.

## Included

- Server Deployment / Service
- Worker Deployment
- PostgreSQL Deployment / PVC / Service
- Redis Deployment / Service
- Ingress (example)

## Quick start

```sh
kubectl apply -f k8s/manifests/
```

These files require customization for your cluster, storage class, ingress controller, and secrets. Do not deploy them unchanged.
